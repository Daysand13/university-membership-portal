"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requireMember } from "@/lib/auth/member";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  barrierReportSchema,
  dateInputToDate,
  mentorshipMessageSchema,
  mentorshipRequestSchema,
  mentorshipSessionSchema,
  studyGroupSchema,
  supportRequestSchema,
} from "@/lib/validations/student-portal";
import { MAX_BARRIER_EVIDENCE_FILES } from "@/lib/portal-options";
import { createBarrierReport, withdrawReport } from "@/lib/services/barrier-report-service";
import { createSupportRequest, withdrawSupportRequest } from "@/lib/services/support-request-service";
import {
  closeStudyGroup,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  StudyGroupError,
} from "@/lib/services/study-group-service";
import {
  bookMentorshipSession,
  endMentorship,
  markMentorshipRead,
  MentorshipError,
  requestMentorship,
  sendMentorshipMessage,
  setSessionStatus,
} from "@/lib/services/mentorship-service";
import { adoptBarrierEvidenceUpload, EnrollmentUploadError } from "@/lib/services/enrollment-upload-service";
import type { ActionState } from "./types";

/**
 * Everything a signed-in student can do beyond their own record: report a
 * barrier, ask for support, run a study group and work with a mentor.
 *
 * Every action starts from requireMember(), so the student it acts for is
 * the one holding the session — never an id posted in the form.
 */

const TOO_MANY = "You've done this a lot in a short time. Please wait a while and try again.";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

// ---------------------------------------------------------------------------
// Barrier reports
// ---------------------------------------------------------------------------

async function reportBarrierActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  const parsed = barrierReportSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    category: text(formData, "category"),
    location: text(formData, "location"),
    occurredOn: text(formData, "occurredOn"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`barrier-report:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: "You've filed several reports today. Please try again tomorrow." };

  // Each attachment arrives as a signed ticket the upload route issued.
  const tokens = formData.getAll("evidenceToken").filter((t): t is string => typeof t === "string" && t.length > 0);
  const names = formData.getAll("evidenceName").map((n) => (typeof n === "string" ? n : ""));
  const evidence = [];
  try {
    for (const [index, token] of tokens.slice(0, MAX_BARRIER_EVIDENCE_FILES).entries()) {
      const upload = await adoptBarrierEvidenceUpload(token);
      if (upload) {
        evidence.push({
          objectKey: upload.objectKey,
          fileName: (names[index] || "Attachment").slice(0, 200),
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        });
      }
    }
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { fieldErrors: { evidence: [err.message] } };
    throw err;
  }

  const report = await createBarrierReport({
    member,
    fields: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      location: blankToNull(parsed.data.location),
      occurredOn: parsed.data.occurredOn ? dateInputToDate(parsed.data.occurredOn) : null,
    },
    evidence,
  });

  revalidatePath("/membership/dashboard");
  revalidatePath("/membership/dashboard/rights");
  revalidatePath("/admin/advocacy");
  redirect(`/membership/dashboard/rights/${report.id}?filed=1`);
}

async function withdrawReportActionImpl(reportId: string): Promise<void> {
  const member = await requireMember();
  await withdrawReport({ memberId: member.id, id: reportId });
  revalidatePath("/membership/dashboard/rights");
  revalidatePath("/admin/advocacy");
}

// ---------------------------------------------------------------------------
// Support requests
// ---------------------------------------------------------------------------

async function requestSupportActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  const parsed = supportRequestSchema.safeParse({
    type: text(formData, "type"),
    details: text(formData, "details"),
    amount: text(formData, "amount"),
    neededBy: text(formData, "neededBy"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`support-request:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  const amount = Number((parsed.data.amount ?? "").replace(/[,\s]/g, ""));
  await createSupportRequest({
    member,
    fields: {
      type: parsed.data.type,
      details: parsed.data.details,
      amountRequestedPesewas:
        parsed.data.type === "WELFARE" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null,
      neededBy: parsed.data.neededBy ? dateInputToDate(parsed.data.neededBy) : null,
    },
  });

  revalidatePath("/membership/dashboard");
  revalidatePath("/membership/dashboard/support");
  revalidatePath("/admin/support-requests");
  return { success: true };
}

async function withdrawSupportRequestActionImpl(requestId: string): Promise<void> {
  const member = await requireMember();
  await withdrawSupportRequest({ memberId: member.id, id: requestId });
  revalidatePath("/membership/dashboard/support");
  revalidatePath("/admin/support-requests");
}

// ---------------------------------------------------------------------------
// Study groups
// ---------------------------------------------------------------------------

async function createStudyGroupActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  const parsed = studyGroupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`study-group:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  await createStudyGroup({
    member,
    fields: {
      name: parsed.data.name,
      focus: parsed.data.focus,
      description: blankToNull(parsed.data.description),
      meetingInfo: blankToNull(parsed.data.meetingInfo),
    },
  });
  revalidatePath("/membership/dashboard/study-groups");
  return { success: true };
}

async function joinStudyGroupActionImpl(groupId: string): Promise<void> {
  const member = await requireMember();
  try {
    await joinStudyGroup({ groupId, memberId: member.id });
  } catch (err) {
    if (!(err instanceof StudyGroupError)) throw err;
  }
  revalidatePath("/membership/dashboard/study-groups");
}

async function leaveStudyGroupActionImpl(groupId: string): Promise<void> {
  const member = await requireMember();
  await leaveStudyGroup({ groupId, memberId: member.id });
  revalidatePath("/membership/dashboard/study-groups");
}

async function closeStudyGroupActionImpl(groupId: string): Promise<void> {
  const member = await requireMember();
  try {
    await closeStudyGroup({ groupId, memberId: member.id });
  } catch (err) {
    if (!(err instanceof StudyGroupError)) throw err;
  }
  revalidatePath("/membership/dashboard/study-groups");
}

// ---------------------------------------------------------------------------
// Mentorship
// ---------------------------------------------------------------------------

async function requestMentorActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();
  const parsed = mentorshipRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`mentor-request:${member.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  try {
    await requestMentorship({ member, alumniId: parsed.data.alumniId, requestNote: parsed.data.requestNote });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath("/membership/dashboard/mentorship");
  revalidatePath("/alumni/mentorship");
  return { success: true };
}

async function sendStudentMessageActionImpl(
  mentorshipId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const parsed = mentorshipMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`mentor-message:${member.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  try {
    await sendMentorshipMessage({ id: mentorshipId, sender: "STUDENT", actorId: member.id, body: parsed.data.body });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/membership/dashboard/mentorship/${mentorshipId}`);
  return { success: true };
}

async function bookSessionAsStudentActionImpl(
  mentorshipId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const parsed = mentorshipSessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await bookMentorshipSession({
      id: mentorshipId,
      bookedByStudent: true,
      actorId: member.id,
      scheduledFor: new Date(parsed.data.scheduledFor),
      topic: blankToNull(parsed.data.topic),
    });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/membership/dashboard/mentorship/${mentorshipId}`);
  return { success: true };
}

async function cancelSessionAsStudentActionImpl(sessionId: string): Promise<void> {
  const member = await requireMember();
  try {
    await setSessionStatus({ sessionId, status: "CANCELLED", by: "student", actorId: member.id });
  } catch (err) {
    if (!(err instanceof MentorshipError)) throw err;
  }
  revalidatePath("/membership/dashboard/mentorship");
}

async function endMentorshipAsStudentActionImpl(mentorshipId: string): Promise<void> {
  const member = await requireMember();
  try {
    await endMentorship({ id: mentorshipId, by: "student", actorId: member.id });
  } catch (err) {
    if (!(err instanceof MentorshipError)) throw err;
  }
  revalidatePath("/membership/dashboard/mentorship");
}

async function markMentorshipReadAsStudentActionImpl(mentorshipId: string): Promise<void> {
  const member = await requireMember();
  await markMentorshipRead({ id: mentorshipId, side: "student", actorId: member.id });
}

export const reportBarrierAction = withActionErrorHandling("reportBarrierAction", reportBarrierActionImpl);
export const withdrawReportAction = withVoidActionErrorHandling("withdrawReportAction", withdrawReportActionImpl);
export const requestSupportAction = withActionErrorHandling("requestSupportAction", requestSupportActionImpl);
export const withdrawSupportRequestAction = withVoidActionErrorHandling(
  "withdrawSupportRequestAction",
  withdrawSupportRequestActionImpl,
);
export const createStudyGroupAction = withActionErrorHandling("createStudyGroupAction", createStudyGroupActionImpl);
export const joinStudyGroupAction = withVoidActionErrorHandling("joinStudyGroupAction", joinStudyGroupActionImpl);
export const leaveStudyGroupAction = withVoidActionErrorHandling("leaveStudyGroupAction", leaveStudyGroupActionImpl);
export const closeStudyGroupAction = withVoidActionErrorHandling("closeStudyGroupAction", closeStudyGroupActionImpl);
export const requestMentorAction = withActionErrorHandling("requestMentorAction", requestMentorActionImpl);
export const sendStudentMessageAction = withActionErrorHandling(
  "sendStudentMessageAction",
  sendStudentMessageActionImpl,
);
export const bookSessionAsStudentAction = withActionErrorHandling(
  "bookSessionAsStudentAction",
  bookSessionAsStudentActionImpl,
);
export const cancelSessionAsStudentAction = withVoidActionErrorHandling(
  "cancelSessionAsStudentAction",
  cancelSessionAsStudentActionImpl,
);
export const endMentorshipAsStudentAction = withVoidActionErrorHandling(
  "endMentorshipAsStudentAction",
  endMentorshipAsStudentActionImpl,
);
export const markMentorshipReadAsStudentAction = withVoidActionErrorHandling(
  "markMentorshipReadAsStudentAction",
  markMentorshipReadAsStudentActionImpl,
);
