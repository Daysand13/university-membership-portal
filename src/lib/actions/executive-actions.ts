"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling } from "./with-error-handling";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { adminBroadcastSchema } from "@/lib/validations/patron-portal";
import { opportunityReviewSchema } from "@/lib/validations/alumni-portal";
import {
  barrierTriageSchema,
  escalateReportSchema,
  supportPayoutSchema,
  supportReviewSchema,
} from "@/lib/validations/student-portal";
import {
  addBarrierReportUpdate,
  BarrierReportError,
  escalateBarrierReport,
} from "@/lib/services/barrier-report-service";
import {
  recordSupportFulfilment,
  reviewSupportRequest,
  SupportRequestError,
} from "@/lib/services/support-request-service";
import { OpportunityError, reviewOpportunity } from "@/lib/services/opportunity-service";
import { sendAdminBroadcast } from "@/lib/services/broadcast-service";
import { adoptPatronDocumentUpload, EnrollmentUploadError } from "@/lib/services/enrollment-upload-service";
import type { ActionState } from "./types";

/**
 * The executive desks in the admin area: the escalation queue for barriers
 * students report, the welfare and assistive-support requests, moderation
 * of the alumni opportunity board, and the executives' own broadcasts.
 *
 * These are association operations rather than website content, so they sit
 * with the membership team — MEMBERSHIP_OFFICER, with super admins passing
 * every check as usual.
 */

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// The escalation desk
// ---------------------------------------------------------------------------

async function updateBarrierReportActionImpl(
  reportId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("support.barriers");
  const parsed = barrierTriageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await addBarrierReportUpdate({
      id: reportId,
      admin,
      status: parsed.data.status,
      note: parsed.data.note,
      assignedToId: blankToNull(parsed.data.assignedToId),
    });
  } catch (err) {
    if (err instanceof BarrierReportError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/advocacy");
  revalidatePath(`/admin/advocacy/${reportId}`);
  revalidatePath("/membership/dashboard/rights");
  return {
    success: true,
    message: "Update saved. The student has been emailed, and can follow it on their Know Your Rights page.",
  };
}

async function escalateReportActionImpl(
  reportId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("support.barriers");
  const parsed = escalateReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let issueId: string;
  try {
    const issue = await escalateBarrierReport({
      id: reportId,
      admin,
      issue: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        category: parsed.data.category,
        location: blankToNull(parsed.data.location),
      },
    });
    issueId = issue.id;
  } catch (err) {
    if (err instanceof BarrierReportError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/advocacy");
  revalidatePath("/admin/patrons/advocacy");
  revalidatePath("/patrons/dashboard/advocacy");
  revalidatePath("/membership/dashboard/rights");
  redirect(`/admin/patrons/advocacy/issues/${issueId}`);
}

// ---------------------------------------------------------------------------
// Support requests
// ---------------------------------------------------------------------------

async function reviewSupportRequestActionImpl(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("support.requests.decide");
  const parsed = supportReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const amount = Number((parsed.data.approvedAmount ?? "").replace(/[,\s]/g, ""));
  try {
    await reviewSupportRequest({
      id: requestId,
      admin,
      decision: parsed.data.decision,
      note: blankToNull(parsed.data.note),
      approvedAmountPesewas: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null,
    });
  } catch (err) {
    if (err instanceof SupportRequestError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/support-requests");
  revalidatePath(`/admin/support-requests/${requestId}`);
  revalidatePath("/membership/dashboard/support");
  return {
    success: true,
    message: `Request ${parsed.data.decision === "APPROVE" ? "approved" : "declined"}. The student has been emailed the decision.`,
  };
}

async function recordSupportPayoutActionImpl(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("support.requests.decide");
  const parsed = supportPayoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const amount = Number(parsed.data.amount.replace(/[,\s]/g, ""));
  try {
    await recordSupportFulfilment({
      id: requestId,
      admin,
      amountPesewas: Math.round(amount * 100),
      description: parsed.data.description,
      spentOn: new Date(`${parsed.data.spentOn}T12:00:00Z`),
    });
  } catch (err) {
    if (err instanceof SupportRequestError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/support-requests");
  revalidatePath(`/admin/support-requests/${requestId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/membership/dashboard/support");
  return { success: true };
}

// ---------------------------------------------------------------------------
// The opportunity board
// ---------------------------------------------------------------------------

async function reviewOpportunityActionImpl(
  opportunityId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("support.opportunities.decide");
  const parsed = opportunityReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await reviewOpportunity({
      id: opportunityId,
      admin,
      decision: parsed.data.decision,
      note: blankToNull(parsed.data.note),
    });
  } catch (err) {
    if (err instanceof OpportunityError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/opportunities");
  revalidatePath("/alumni/opportunities");
  revalidatePath("/membership/dashboard/opportunities");
  return {
    success: true,
    message:
      parsed.data.decision === "APPROVE"
        ? "Posting approved — members can see it now, and the alumnus who posted it has been emailed."
        : "Posting declined, and the alumnus who posted it has been emailed.",
  };
}

// ---------------------------------------------------------------------------
// The executives' own broadcasts
// ---------------------------------------------------------------------------

async function sendBroadcastActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("messages.broadcasts.send");
  const parsed = adminBroadcastSchema.safeParse({
    audience: text(formData, "audience"),
    authorName: text(formData, "authorName"),
    subject: text(formData, "subject"),
    bodyHtml: text(formData, "bodyHtml"),
    sendEmail: formData.get("sendEmail") === "on",
    postToPortal: formData.get("postToPortal") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let attachment = null;
  const token = text(formData, "attachmentToken");
  if (token) {
    try {
      const upload = await adoptPatronDocumentUpload(token);
      if (upload) attachment = { ...upload, name: text(formData, "attachmentName").slice(0, 200) || "Attachment" };
    } catch (err) {
      if (err instanceof EnrollmentUploadError) return { fieldErrors: { attachment: [err.message] } };
      throw err;
    }
  }

  const { broadcast, recipients, emailsSent } = await sendAdminBroadcast({
    admin,
    authorName: parsed.data.authorName,
    audience: parsed.data.audience,
    subject: parsed.data.subject,
    bodyHtml: parsed.data.bodyHtml,
    sendEmail: parsed.data.sendEmail,
    postToPortal: parsed.data.postToPortal,
    attachment,
  });

  revalidatePath("/admin/broadcasts");
  revalidatePath("/membership/dashboard/announcements");
  revalidatePath("/alumni/announcements");
  redirect(`/admin/broadcasts?sent=${broadcast.id}&to=${recipients}&emails=${emailsSent}`);
}

export const updateBarrierReportAction = withActionErrorHandling(
  "updateBarrierReportAction",
  updateBarrierReportActionImpl,
);
export const escalateReportAction = withActionErrorHandling("escalateReportAction", escalateReportActionImpl);
export const reviewSupportRequestAction = withActionErrorHandling(
  "reviewSupportRequestAction",
  reviewSupportRequestActionImpl,
);
export const recordSupportPayoutAction = withActionErrorHandling(
  "recordSupportPayoutAction",
  recordSupportPayoutActionImpl,
);
export const reviewOpportunityAction = withActionErrorHandling("reviewOpportunityAction", reviewOpportunityActionImpl);
export const sendBroadcastAction = withActionErrorHandling("sendBroadcastAction", sendBroadcastActionImpl);
