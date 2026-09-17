"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import {
  broadcastReviewSchema,
  campaignSchema,
  cedisToPesewas,
  dateInputToDate,
  expenseSchema,
  issueSchema,
  recordedDonationSchema,
  threadReplySchema,
} from "@/lib/validations/patron-portal";
import { approveBroadcast, BroadcastReviewError, rejectBroadcast } from "@/lib/services/broadcast-service";
import { PatronThreadError, replyAsAdmin, setThreadStatus } from "@/lib/services/patron-message-service";
import {
  createCampaign,
  createIssue,
  deleteCampaign,
  deleteIssue,
  updateCampaign,
  updateIssue,
} from "@/lib/services/advocacy-service";
import {
  createExpense,
  deleteExpense,
  deleteRecordedDonation,
  DonationDeleteError,
  recordOfflineDonation,
  updateExpense,
} from "@/lib/services/patron-finance-service";
import type { ActionState } from "./types";

/**
 * Admin actions for the Patrons' Portal features. The patrons side of the
 * site is run by the membership team, so everything here needs
 * MEMBERSHIP_OFFICER (super admins pass every check).
 */
const requireTeam = () => requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);

const blankToNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

function revalidatePatronViews(...paths: string[]) {
  for (const path of ["/patrons/dashboard", ...paths]) revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

async function reviewBroadcastActionImpl(
  broadcastId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = broadcastReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    if (parsed.data.decision === "APPROVE") {
      await approveBroadcast({ id: broadcastId, adminId: admin.id, note: blankToNull(parsed.data.note) });
    } else {
      await rejectBroadcast({ id: broadcastId, adminId: admin.id, note: (parsed.data.note ?? "").trim() });
    }
  } catch (err) {
    if (err instanceof BroadcastReviewError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/patrons/broadcasts");
  revalidatePath(`/admin/patrons/broadcasts/${broadcastId}`);
  revalidatePatronViews("/patrons/dashboard/messages", "/membership/dashboard", "/alumni/dashboard");
  redirect(`/admin/patrons/broadcasts/${broadcastId}?reviewed=1`);
}

// ---------------------------------------------------------------------------
// Executive channel
// ---------------------------------------------------------------------------

async function adminReplyToThreadActionImpl(threadId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = threadReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await replyAsAdmin({ adminId: admin.id, threadId, body: parsed.data.body });
  } catch (err) {
    if (err instanceof PatronThreadError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/patrons/messages");
  revalidatePath(`/admin/patrons/messages/${threadId}`);
  revalidatePatronViews(`/patrons/dashboard/messages/${threadId}`, "/patrons/dashboard/messages");
  return { success: true };
}

async function setThreadStatusActionImpl(threadId: string, status: "OPEN" | "CLOSED"): Promise<void> {
  const admin = await requireTeam();
  await setThreadStatus({ adminId: admin.id, threadId, status });
  revalidatePath("/admin/patrons/messages");
  revalidatePath(`/admin/patrons/messages/${threadId}`);
  revalidatePath(`/patrons/dashboard/messages/${threadId}`);
}

// ---------------------------------------------------------------------------
// Advocacy
// ---------------------------------------------------------------------------

async function saveCampaignActionImpl(campaignId: string | null, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const fields = {
    title: parsed.data.title,
    summary: parsed.data.summary,
    details: blankToNull(parsed.data.details),
    initiatedBy: blankToNull(parsed.data.initiatedBy),
    targetBody: blankToNull(parsed.data.targetBody),
    status: parsed.data.status,
  };

  revalidatePath("/admin/patrons/advocacy");
  revalidatePatronViews("/patrons/dashboard/advocacy");
  if (campaignId) {
    await updateCampaign(campaignId, fields, admin.id);
    revalidatePath(`/admin/patrons/advocacy/campaigns/${campaignId}`);
    revalidatePath(`/patrons/dashboard/advocacy/campaigns/${campaignId}`);
    return { success: true };
  }
  const campaign = await createCampaign(fields, admin.id);
  redirect(`/admin/patrons/advocacy/campaigns/${campaign.id}?created=1`);
}

async function deleteCampaignActionImpl(campaignId: string): Promise<void> {
  const admin = await requireTeam();
  await deleteCampaign(campaignId, admin.id);
  revalidatePath("/admin/patrons/advocacy");
  revalidatePatronViews("/patrons/dashboard/advocacy");
  redirect("/admin/patrons/advocacy");
}

async function saveIssueActionImpl(issueId: string | null, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = issueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const fields = {
    title: parsed.data.title,
    summary: parsed.data.summary,
    category: parsed.data.category,
    location: blankToNull(parsed.data.location),
    status: parsed.data.status,
    reportedOn: dateInputToDate(parsed.data.reportedOn),
    resolutionNote: blankToNull(parsed.data.resolutionNote),
  };

  revalidatePath("/admin/patrons/advocacy");
  revalidatePatronViews("/patrons/dashboard/advocacy");
  if (issueId) {
    await updateIssue(issueId, fields, admin.id);
    revalidatePath(`/admin/patrons/advocacy/issues/${issueId}`);
    revalidatePath(`/patrons/dashboard/advocacy/issues/${issueId}`);
    return { success: true };
  }
  const issue = await createIssue(fields, admin.id);
  redirect(`/admin/patrons/advocacy/issues/${issue.id}?created=1`);
}

async function deleteIssueActionImpl(issueId: string): Promise<void> {
  const admin = await requireTeam();
  await deleteIssue(issueId, admin.id);
  revalidatePath("/admin/patrons/advocacy");
  revalidatePatronViews("/patrons/dashboard/advocacy");
  redirect("/admin/patrons/advocacy");
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

function revalidateFinance() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/expenses");
  revalidatePath("/admin/finance/donations");
  revalidatePatronViews("/patrons/dashboard/finances");
}

async function saveExpenseActionImpl(expenseId: string | null, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const fields = {
    category: parsed.data.category,
    description: parsed.data.description,
    amountPesewas: cedisToPesewas(parsed.data.amount),
    spentOn: dateInputToDate(parsed.data.spentOn),
    adminId: admin.id,
  };
  if (expenseId) await updateExpense({ id: expenseId, ...fields });
  else await createExpense(fields);
  revalidateFinance();
  redirect("/admin/finance/expenses?saved=1");
}

async function deleteExpenseActionImpl(expenseId: string): Promise<void> {
  const admin = await requireTeam();
  await deleteExpense({ id: expenseId, adminId: admin.id });
  revalidateFinance();
}

async function recordDonationActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireTeam();
  const parsed = recordedDonationSchema.safeParse({
    ...Object.fromEntries(formData),
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await recordOfflineDonation({
    donorName: parsed.data.donorName,
    donorEmail: blankToNull(parsed.data.donorEmail),
    amountPesewas: cedisToPesewas(parsed.data.amount),
    fund: parsed.data.fund,
    receivedOn: dateInputToDate(parsed.data.receivedOn),
    note: blankToNull(parsed.data.note),
    anonymous: parsed.data.anonymous,
    adminId: admin.id,
  });
  revalidateFinance();
  redirect("/admin/finance/donations?recorded=1");
}

async function deleteRecordedDonationActionImpl(donationId: string): Promise<void> {
  const admin = await requireTeam();
  try {
    await deleteRecordedDonation({ id: donationId, adminId: admin.id });
  } catch (err) {
    // Nothing to show it on; the list simply stays as it was.
    if (err instanceof DonationDeleteError) return;
    throw err;
  }
  revalidateFinance();
}

export const reviewBroadcastAction = withActionErrorHandling("reviewBroadcastAction", reviewBroadcastActionImpl);
export const adminReplyToThreadAction = withActionErrorHandling("adminReplyToThreadAction", adminReplyToThreadActionImpl);
export const setThreadStatusAction = withVoidActionErrorHandling("setThreadStatusAction", setThreadStatusActionImpl);
export const saveCampaignAction = withActionErrorHandling("saveCampaignAction", saveCampaignActionImpl);
export const deleteCampaignAction = withVoidActionErrorHandling("deleteCampaignAction", deleteCampaignActionImpl);
export const saveIssueAction = withActionErrorHandling("saveIssueAction", saveIssueActionImpl);
export const deleteIssueAction = withVoidActionErrorHandling("deleteIssueAction", deleteIssueActionImpl);
export const saveExpenseAction = withActionErrorHandling("saveExpenseAction", saveExpenseActionImpl);
export const deleteExpenseAction = withVoidActionErrorHandling("deleteExpenseAction", deleteExpenseActionImpl);
export const recordDonationAction = withActionErrorHandling("recordDonationAction", recordDonationActionImpl);
export const deleteRecordedDonationAction = withVoidActionErrorHandling(
  "deleteRecordedDonationAction",
  deleteRecordedDonationActionImpl,
);
