"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requirePatron } from "@/lib/auth/patron";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  broadcastSchema,
  cedisToPesewas,
  donationSchema,
  endorsementSchema,
  issueActionSchema,
  patronDocumentSchema,
  threadCreateSchema,
  threadReplySchema,
} from "@/lib/validations/patron-portal";
import { initiatePatronDonation } from "@/lib/services/patron-finance-service";
import { createBroadcast, withdrawBroadcast } from "@/lib/services/broadcast-service";
import { createPatronThread, PatronThreadError, replyAsPatron } from "@/lib/services/patron-message-service";
import {
  AdvocacyError,
  endorseCampaign,
  takeIssueAction,
  withdrawEndorsement,
} from "@/lib/services/advocacy-service";
import { createPatronDocument, deletePatronDraft } from "@/lib/services/document-service";
import { adoptPatronDocumentUpload, EnrollmentUploadError } from "@/lib/services/enrollment-upload-service";
import { notifyAdminsOfPatronDocument } from "@/lib/services/patron-portal-notification-service";
import { markPatronNotificationsSeen } from "@/lib/services/patron-insights-service";
import type { ActionState } from "./types";

const TOO_MANY = "You've done this a lot in a short time. Please wait a while and try again.";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function appUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? ""}${path}`;
}

// ---------------------------------------------------------------------------
// Finances
// ---------------------------------------------------------------------------

async function startDonationActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = donationSchema.safeParse({
    amount: text(formData, "amount"),
    fund: text(formData, "fund"),
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`patron-donate:${patron.id}`, { max: 20, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  const result = await initiatePatronDonation({
    patron,
    amountPesewas: cedisToPesewas(parsed.data.amount),
    fund: parsed.data.fund,
    anonymous: parsed.data.anonymous,
    callbackUrl: appUrl("/api/donations/callback"),
  });
  if (!result.ok) return { error: result.error };
  redirect(result.authorizationUrl);
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

async function submitBroadcastActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = broadcastSchema.safeParse({
    audience: text(formData, "audience"),
    subject: text(formData, "subject"),
    bodyHtml: text(formData, "bodyHtml"),
    sendEmail: formData.get("sendEmail") === "on",
    postToPortal: formData.get("postToPortal") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`patron-broadcast:${patron.id}`, { max: 10, windowSeconds: 24 * 3600 });
  if (!limit.allowed) return { error: "You've sent several broadcasts today. Please try again tomorrow." };

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

  await createBroadcast({ patron, ...parsed.data, attachment });
  revalidatePath("/patrons/dashboard/messages");
  revalidatePath("/admin/patrons/broadcasts");
  return { success: true };
}

async function withdrawBroadcastActionImpl(broadcastId: string): Promise<void> {
  const patron = await requirePatron();
  await withdrawBroadcast({ patronId: patron.id, broadcastId });
  revalidatePath("/patrons/dashboard/messages");
  revalidatePath("/admin/patrons/broadcasts");
}

// ---------------------------------------------------------------------------
// Executive channel
// ---------------------------------------------------------------------------

async function startThreadActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = threadCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`patron-thread:${patron.id}`, { max: 15, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  const thread = await createPatronThread({ patron, ...parsed.data });
  revalidatePath("/patrons/dashboard/messages");
  revalidatePath("/admin/patrons/messages");
  redirect(`/patrons/dashboard/messages/${thread.id}`);
}

async function replyToThreadActionImpl(threadId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = threadReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`patron-reply:${patron.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  try {
    await replyAsPatron({ patron, threadId, body: parsed.data.body });
  } catch (err) {
    if (err instanceof PatronThreadError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/patrons/dashboard/messages/${threadId}`);
  revalidatePath("/admin/patrons/messages");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Advocacy
// ---------------------------------------------------------------------------

async function endorseCampaignActionImpl(campaignId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = endorsementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await endorseCampaign({ campaignId, patron, comment: parsed.data.comment || null });
  } catch (err) {
    if (err instanceof AdvocacyError) return { error: err.message };
    throw err;
  }
  revalidatePath("/patrons/dashboard/advocacy");
  revalidatePath(`/patrons/dashboard/advocacy/campaigns/${campaignId}`);
  revalidatePath(`/admin/patrons/advocacy/campaigns/${campaignId}`);
  return { success: true };
}

async function withdrawEndorsementActionImpl(campaignId: string): Promise<void> {
  const patron = await requirePatron();
  await withdrawEndorsement({ campaignId, patronId: patron.id });
  revalidatePath("/patrons/dashboard/advocacy");
  revalidatePath(`/patrons/dashboard/advocacy/campaigns/${campaignId}`);
  revalidatePath(`/admin/patrons/advocacy/campaigns/${campaignId}`);
}

async function takeIssueActionActionImpl(issueId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = issueActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const limit = await checkRateLimit(`patron-issue-action:${patron.id}`, { max: 20, windowSeconds: 3600 });
  if (!limit.allowed) return { error: TOO_MANY };

  try {
    await takeIssueAction({ issueId, patron, ...parsed.data });
  } catch (err) {
    if (err instanceof AdvocacyError) return { error: err.message };
    throw err;
  }
  revalidatePath("/patrons/dashboard/advocacy");
  revalidatePath(`/patrons/dashboard/advocacy/issues/${issueId}`);
  revalidatePath(`/admin/patrons/advocacy/issues/${issueId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

async function uploadPatronDocumentActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = patronDocumentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const token = text(formData, "fileToken");
  if (!token) return { fieldErrors: { file: ["Attach the document first."] } };

  let upload;
  try {
    upload = await adoptPatronDocumentUpload(token);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { fieldErrors: { file: [err.message] } };
    throw err;
  }
  if (!upload) return { error: "File storage isn't available right now. Please try again later." };

  const document = await createPatronDocument({
    patronId: patron.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    file: upload,
  });
  await notifyAdminsOfPatronDocument({ document, patron });
  revalidatePath("/patrons/dashboard/documents");
  revalidatePath("/admin/library");
  return { success: true };
}

async function deletePatronUploadActionImpl(documentId: string): Promise<void> {
  const patron = await requirePatron();
  await deletePatronDraft({ patronId: patron.id, documentId });
  revalidatePath("/patrons/dashboard/documents");
  revalidatePath("/admin/library");
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function markNotificationsSeenActionImpl(): Promise<void> {
  const patron = await requirePatron();
  await markPatronNotificationsSeen(patron.id);
}

export const startDonationAction = withActionErrorHandling("startDonationAction", startDonationActionImpl);
export const submitBroadcastAction = withActionErrorHandling("submitBroadcastAction", submitBroadcastActionImpl);
export const withdrawBroadcastAction = withVoidActionErrorHandling("withdrawBroadcastAction", withdrawBroadcastActionImpl);
export const startThreadAction = withActionErrorHandling("startThreadAction", startThreadActionImpl);
export const replyToThreadAction = withActionErrorHandling("replyToThreadAction", replyToThreadActionImpl);
export const endorseCampaignAction = withActionErrorHandling("endorseCampaignAction", endorseCampaignActionImpl);
export const withdrawEndorsementAction = withVoidActionErrorHandling(
  "withdrawEndorsementAction",
  withdrawEndorsementActionImpl,
);
export const takeIssueActionAction = withActionErrorHandling("takeIssueActionAction", takeIssueActionActionImpl);
export const uploadPatronDocumentAction = withActionErrorHandling(
  "uploadPatronDocumentAction",
  uploadPatronDocumentActionImpl,
);
export const deletePatronUploadAction = withVoidActionErrorHandling(
  "deletePatronUploadAction",
  deletePatronUploadActionImpl,
);
export const markNotificationsSeenAction = withVoidActionErrorHandling(
  "markNotificationsSeenAction",
  markNotificationsSeenActionImpl,
);
