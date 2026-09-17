import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type {
  CampaignStatus,
  IssueActionType,
  IssueCategory,
  IssueStatus,
  PatronProfile,
} from "@/generated/prisma/client";
import {
  notifyAdminsOfEndorsement,
  notifyAdminsOfIssueAction,
} from "@/lib/services/patron-portal-notification-service";

/**
 * The Advocacy & Rights hub: campaigns the executive team runs (which
 * patrons can officially endorse) and rights or accessibility issues
 * escalated to the patrons (on which a patron can ask for a meeting with
 * management or issue a statement). Administrators create and update both;
 * patrons act on them.
 */

export class AdvocacyError extends Error {}

type PatronActor = Pick<PatronProfile, "id" | "email" | "title" | "fullName" | "phone">;

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface CampaignFields {
  title: string;
  summary: string;
  details: string | null;
  initiatedBy: string | null;
  targetBody: string | null;
  status: CampaignStatus;
}

export async function listCampaigns(params?: { status?: CampaignStatus; patronId?: string }) {
  const campaigns = await db.advocacyCampaign.findMany({
    where: params?.status ? { status: params.status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { endorsements: true } },
      // Only ever the viewing patron's own endorsement (none for an admin).
      endorsements: { where: { patronId: params?.patronId ?? "" }, select: { id: true } },
    },
    take: 200,
  });
  return campaigns.map((c) => ({
    ...c,
    endorsementCount: c._count.endorsements,
    endorsedByMe: c.endorsements.length > 0,
  }));
}

export async function getCampaign(id: string) {
  return db.advocacyCampaign.findUnique({
    where: { id },
    include: {
      endorsements: {
        orderBy: { createdAt: "asc" },
        include: {
          patron: { select: { id: true, title: true, fullName: true, jobTitle: true, organization: true, occupation: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });
}

export async function createCampaign(fields: CampaignFields, adminId: string) {
  const campaign = await db.advocacyCampaign.create({ data: { ...fields, createdById: adminId } });
  await db.auditLog.create({
    data: { adminId, action: "CREATE_CAMPAIGN", entityType: "AdvocacyCampaign", entityId: campaign.id, newValue: { title: campaign.title } },
  });
  return campaign;
}

export async function updateCampaign(id: string, fields: CampaignFields, adminId: string) {
  const campaign = await db.advocacyCampaign.update({ where: { id }, data: fields });
  await db.auditLog.create({
    data: {
      adminId,
      action: "UPDATE_CAMPAIGN",
      entityType: "AdvocacyCampaign",
      entityId: id,
      newValue: { title: campaign.title, status: campaign.status },
    },
  });
  return campaign;
}

export async function deleteCampaign(id: string, adminId: string) {
  const campaign = await db.advocacyCampaign.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      adminId,
      action: "DELETE_CAMPAIGN",
      entityType: "AdvocacyCampaign",
      entityId: id,
      previousValue: { title: campaign.title, status: campaign.status },
    },
  });
}

export async function endorseCampaign(params: { campaignId: string; patron: PatronActor; comment: string | null }) {
  const { campaignId, patron, comment } = params;
  const campaign = await db.advocacyCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AdvocacyError("That campaign couldn't be found.");
  if (campaign.status !== "ACTIVE") throw new AdvocacyError("This campaign is no longer taking endorsements.");

  try {
    await db.campaignEndorsement.create({ data: { campaignId, patronId: patron.id, comment } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AdvocacyError("You've already endorsed this campaign.");
    }
    throw err;
  }
  await notifyAdminsOfEndorsement({ campaign, patron, comment });
}

export async function withdrawEndorsement(params: { campaignId: string; patronId: string }) {
  await db.campaignEndorsement.deleteMany({ where: { campaignId: params.campaignId, patronId: params.patronId } });
}

// ---------------------------------------------------------------------------
// Escalated issues
// ---------------------------------------------------------------------------

export interface IssueFields {
  title: string;
  summary: string;
  category: IssueCategory;
  location: string | null;
  status: IssueStatus;
  reportedOn: Date;
  resolutionNote: string | null;
}

/** Open issues first (by stage), then the rest, newest first. */
export async function listIssues(params?: { status?: IssueStatus; openOnly?: boolean; take?: number }) {
  return db.accessibilityIssue.findMany({
    where: params?.status ? { status: params.status } : params?.openOnly ? { status: { not: "RESOLVED" } } : {},
    orderBy: [{ reportedOn: "desc" }],
    include: { _count: { select: { actions: true } } },
    take: params?.take ?? 200,
  });
}

export async function getIssue(id: string) {
  return db.accessibilityIssue.findUnique({
    where: { id },
    include: {
      actions: {
        orderBy: { createdAt: "asc" },
        include: {
          patron: { select: { id: true, title: true, fullName: true, jobTitle: true, organization: true, email: true, phone: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });
}

function resolvedAtFor(status: IssueStatus, previous: Date | null): Date | null {
  if (status !== "RESOLVED") return null;
  return previous ?? new Date();
}

export async function createIssue(fields: IssueFields, adminId: string) {
  const issue = await db.accessibilityIssue.create({
    data: { ...fields, resolvedAt: resolvedAtFor(fields.status, null), createdById: adminId },
  });
  await db.auditLog.create({
    data: { adminId, action: "CREATE_ISSUE", entityType: "AccessibilityIssue", entityId: issue.id, newValue: { title: issue.title } },
  });
  return issue;
}

export async function updateIssue(id: string, fields: IssueFields, adminId: string) {
  const before = await db.accessibilityIssue.findUniqueOrThrow({ where: { id } });
  const issue = await db.accessibilityIssue.update({
    where: { id },
    data: { ...fields, resolvedAt: resolvedAtFor(fields.status, before.resolvedAt) },
  });
  await db.auditLog.create({
    data: {
      adminId,
      action: "UPDATE_ISSUE",
      entityType: "AccessibilityIssue",
      entityId: id,
      previousValue: { status: before.status },
      newValue: { title: issue.title, status: issue.status },
    },
  });
  return issue;
}

export async function deleteIssue(id: string, adminId: string) {
  const issue = await db.accessibilityIssue.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      adminId,
      action: "DELETE_ISSUE",
      entityType: "AccessibilityIssue",
      entityId: id,
      previousValue: { title: issue.title, status: issue.status },
    },
  });
}

/**
 * Records a patron's action on an issue. An issue that was still waiting on
 * the executive moves to "Patron Action Taken"; a resolved one can't be
 * acted on.
 */
export async function takeIssueAction(params: {
  issueId: string;
  patron: PatronActor;
  type: IssueActionType;
  message: string;
}) {
  const { issueId, patron, type, message } = params;
  const issue = await db.accessibilityIssue.findUnique({ where: { id: issueId } });
  if (!issue) throw new AdvocacyError("That issue couldn't be found.");
  if (issue.status === "RESOLVED") throw new AdvocacyError("This issue has already been resolved.");

  await db.issuePatronAction.create({ data: { issueId, patronId: patron.id, type, message } });
  let status = issue.status;
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") {
    await db.accessibilityIssue.updateMany({
      where: { id: issueId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      data: { status: "PATRON_ACTION" },
    });
    status = "PATRON_ACTION";
  }
  await notifyAdminsOfIssueAction({ issue: { ...issue, status }, patron, type, message });
}

export async function getAdvocacyCounts() {
  const [activeCampaigns, openIssues] = await Promise.all([
    db.advocacyCampaign.count({ where: { status: "ACTIVE" } }),
    db.accessibilityIssue.count({ where: { status: { not: "RESOLVED" } } }),
  ]);
  return { activeCampaigns, openIssues };
}
