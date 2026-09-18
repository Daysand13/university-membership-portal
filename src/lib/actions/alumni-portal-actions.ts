"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requireAlumni } from "@/lib/auth/alumni";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { cedisToPesewas, donationSchema, endorsementSchema } from "@/lib/validations/patron-portal";
import { mentorSettingsSchema, opportunitySchema } from "@/lib/validations/alumni-portal";
import {
  mentorshipMessageSchema,
  mentorshipResponseSchema,
  mentorshipSessionSchema,
} from "@/lib/validations/student-portal";
import { initiateAlumniDonation } from "@/lib/services/alumni-giving-service";
import { createOpportunity, withdrawOpportunity } from "@/lib/services/opportunity-service";
import {
  AdvocacyError,
  endorseCampaignAsAlumni,
  withdrawAlumniEndorsement,
} from "@/lib/services/advocacy-service";
import {
  bookMentorshipSession,
  endMentorship,
  markMentorshipRead,
  MentorshipError,
  respondToMentorshipRequest,
  sendMentorshipMessage,
  setSessionStatus,
} from "@/lib/services/mentorship-service";
import type { ActionState } from "./types";

/**
 * What a signed-in graduate can do: give, mentor, post opportunities and
 * co-sign campaigns. Like the student actions, every one starts from
 * requireAlumni() so it can only ever act for the account holding the
 * session.
 */

const TOO_MANY = "You've done this a lot in a short time. Please wait a while and try again.";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function appUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? ""}${path}`;
}

// ---------------------------------------------------------------------------
// Giving
// ---------------------------------------------------------------------------

async function startAlumniDonationActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = donationSchema.safeParse({
    amount: text(formData, "amount"),
    fund: text(formData, "fund"),
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`alumni-donate:${alumni.id}`, { max: 20, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  const result = await initiateAlumniDonation({
    alumni,
    amountPesewas: cedisToPesewas(parsed.data.amount),
    fund: parsed.data.fund,
    anonymous: parsed.data.anonymous,
    callbackUrl: appUrl("/api/donations/callback"),
  });
  if (!result.ok) return { error: result.error };
  redirect(result.authorizationUrl);
}

// ---------------------------------------------------------------------------
// The opportunity board
// ---------------------------------------------------------------------------

async function postOpportunityActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = opportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`alumni-opportunity:${alumni.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: "You've posted several openings today. Please try again tomorrow." };

  await createOpportunity({
    alumni,
    fields: {
      title: parsed.data.title,
      organization: parsed.data.organization,
      type: parsed.data.type,
      location: blankToNull(parsed.data.location),
      description: parsed.data.description,
      applyUrl: blankToNull(parsed.data.applyUrl),
      applyEmail: blankToNull(parsed.data.applyEmail),
      closingDate: parsed.data.closingDate ? new Date(`${parsed.data.closingDate}T23:59:59Z`) : null,
    },
  });

  revalidatePath("/alumni/opportunities");
  revalidatePath("/admin/opportunities");
  return { success: true };
}

async function withdrawOpportunityActionImpl(opportunityId: string): Promise<void> {
  const alumni = await requireAlumni();
  await withdrawOpportunity({ alumniId: alumni.id, id: opportunityId });
  revalidatePath("/alumni/opportunities");
  revalidatePath("/admin/opportunities");
}

// ---------------------------------------------------------------------------
// Advocacy backing
// ---------------------------------------------------------------------------

async function coSignCampaignActionImpl(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = endorsementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await endorseCampaignAsAlumni({ campaignId, alumni, comment: blankToNull(parsed.data.comment) });
  } catch (err) {
    if (err instanceof AdvocacyError) return { error: err.message };
    throw err;
  }
  revalidatePath("/alumni/advocacy");
  revalidatePath(`/alumni/advocacy/${campaignId}`);
  return { success: true };
}

async function withdrawCoSignatureActionImpl(campaignId: string): Promise<void> {
  const alumni = await requireAlumni();
  await withdrawAlumniEndorsement({ campaignId, alumniId: alumni.id });
  revalidatePath("/alumni/advocacy");
  revalidatePath(`/alumni/advocacy/${campaignId}`);
}

// ---------------------------------------------------------------------------
// Mentoring
// ---------------------------------------------------------------------------

async function saveMentorSettingsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = mentorSettingsSchema.safeParse({
    willingToMentor: formData.get("willingToMentor") === "on",
    mentorAvailability: text(formData, "mentorAvailability"),
    mentorCapacity: text(formData, "mentorCapacity") || "3",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await db.alumniProfile.update({
    where: { id: alumni.id },
    data: {
      willingToMentor: parsed.data.willingToMentor,
      mentorAvailability: blankToNull(parsed.data.mentorAvailability),
      mentorCapacity: parsed.data.mentorCapacity,
    },
  });
  revalidatePath("/alumni/mentorship");
  revalidatePath("/membership/dashboard/mentorship");
  return { success: true };
}

async function respondToRequestActionImpl(
  mentorshipId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = mentorshipResponseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await respondToMentorshipRequest({
      id: mentorshipId,
      alumniId: alumni.id,
      decision: parsed.data.decision,
      goals: blankToNull(parsed.data.goals),
      declineReason: blankToNull(parsed.data.declineReason),
    });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath("/alumni/mentorship");
  revalidatePath("/membership/dashboard/mentorship");
  return { success: true };
}

async function sendMentorMessageActionImpl(
  mentorshipId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = mentorshipMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`mentor-message:${alumni.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  try {
    await sendMentorshipMessage({ id: mentorshipId, sender: "MENTOR", actorId: alumni.id, body: parsed.data.body });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/alumni/mentorship/${mentorshipId}`);
  return { success: true };
}

async function bookSessionAsMentorActionImpl(
  mentorshipId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = mentorshipSessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await bookMentorshipSession({
      id: mentorshipId,
      bookedByStudent: false,
      actorId: alumni.id,
      scheduledFor: new Date(parsed.data.scheduledFor),
      topic: blankToNull(parsed.data.topic),
    });
  } catch (err) {
    if (err instanceof MentorshipError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/alumni/mentorship/${mentorshipId}`);
  return { success: true };
}

async function closeSessionAsMentorActionImpl(sessionId: string, completed: boolean): Promise<void> {
  const alumni = await requireAlumni();
  try {
    await setSessionStatus({
      sessionId,
      status: completed ? "COMPLETED" : "CANCELLED",
      by: "mentor",
      actorId: alumni.id,
    });
  } catch (err) {
    if (!(err instanceof MentorshipError)) throw err;
  }
  revalidatePath("/alumni/mentorship");
}

async function endMentorshipAsMentorActionImpl(mentorshipId: string): Promise<void> {
  const alumni = await requireAlumni();
  try {
    await endMentorship({ id: mentorshipId, by: "mentor", actorId: alumni.id });
  } catch (err) {
    if (!(err instanceof MentorshipError)) throw err;
  }
  revalidatePath("/alumni/mentorship");
}

async function markMentorshipReadAsMentorActionImpl(mentorshipId: string): Promise<void> {
  const alumni = await requireAlumni();
  await markMentorshipRead({ id: mentorshipId, side: "mentor", actorId: alumni.id });
}

export const startAlumniDonationAction = withActionErrorHandling(
  "startAlumniDonationAction",
  startAlumniDonationActionImpl,
);
export const postOpportunityAction = withActionErrorHandling("postOpportunityAction", postOpportunityActionImpl);
export const withdrawOpportunityAction = withVoidActionErrorHandling(
  "withdrawOpportunityAction",
  withdrawOpportunityActionImpl,
);
export const coSignCampaignAction = withActionErrorHandling("coSignCampaignAction", coSignCampaignActionImpl);
export const withdrawCoSignatureAction = withVoidActionErrorHandling(
  "withdrawCoSignatureAction",
  withdrawCoSignatureActionImpl,
);
export const saveMentorSettingsAction = withActionErrorHandling(
  "saveMentorSettingsAction",
  saveMentorSettingsActionImpl,
);
export const respondToRequestAction = withActionErrorHandling("respondToRequestAction", respondToRequestActionImpl);
export const sendMentorMessageAction = withActionErrorHandling("sendMentorMessageAction", sendMentorMessageActionImpl);
export const bookSessionAsMentorAction = withActionErrorHandling(
  "bookSessionAsMentorAction",
  bookSessionAsMentorActionImpl,
);
export const closeSessionAsMentorAction = withVoidActionErrorHandling(
  "closeSessionAsMentorAction",
  closeSessionAsMentorActionImpl,
);
export const endMentorshipAsMentorAction = withVoidActionErrorHandling(
  "endMentorshipAsMentorAction",
  endMentorshipAsMentorActionImpl,
);
export const markMentorshipReadAsMentorAction = withVoidActionErrorHandling(
  "markMentorshipReadAsMentorAction",
  markMentorshipReadAsMentorActionImpl,
);
