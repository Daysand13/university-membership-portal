import "server-only";
import { db } from "@/lib/db";
import type { AdminUser, AlumniProfile, OpportunityStatus, OpportunityType } from "@/generated/prisma/client";
import {
  notifyAdminsOfOpportunity,
  notifyAlumniOfOpportunityDecision,
} from "@/lib/services/portal-notification-service";

/**
 * The opportunity board: jobs, internships, scholarships and volunteering
 * that graduates post for the students coming up behind them.
 *
 * Reviewed before it appears, for the same reason a patron's broadcast is:
 * a post carries an outside link and an outside email address into a portal
 * whose members are a group people do target. The review is the association
 * vouching for it, not censorship.
 */

export class OpportunityError extends Error {}

export interface OpportunityFields {
  title: string;
  organization: string;
  type: OpportunityType;
  location: string | null;
  description: string;
  applyUrl: string | null;
  applyEmail: string | null;
  closingDate: Date | null;
}

export async function createOpportunity(params: {
  alumni: Pick<AlumniProfile, "id" | "fullName" | "email">;
  fields: OpportunityFields;
}) {
  const opportunity = await db.opportunity.create({
    data: { alumniId: params.alumni.id, postedByName: params.alumni.fullName, ...params.fields },
  });
  await notifyAdminsOfOpportunity({ opportunity, alumni: params.alumni });
  return opportunity;
}

/** Live postings, for students and alumni. Expired ones drop off on their own. */
export async function listOpenOpportunities(params?: { type?: OpportunityType; take?: number }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.opportunity.findMany({
    where: {
      status: "APPROVED",
      ...(params?.type ? { type: params.type } : {}),
      OR: [{ closingDate: null }, { closingDate: { gte: today } }],
    },
    orderBy: [{ createdAt: "desc" }],
    take: params?.take ?? 100,
  });
}

export async function countOpenOpportunities(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.opportunity.count({
    where: { status: "APPROVED", OR: [{ closingDate: null }, { closingDate: { gte: today } }] },
  });
}

export async function listOpportunitiesForAlumni(alumniId: string) {
  return db.opportunity.findMany({ where: { alumniId }, orderBy: { createdAt: "desc" }, take: 50 });
}

/** An alumnus can take back a posting that hasn't been reviewed yet. */
export async function withdrawOpportunity(params: { alumniId: string; id: string }): Promise<boolean> {
  const { count } = await db.opportunity.deleteMany({
    where: { id: params.id, alumniId: params.alumniId, status: "PENDING" },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export async function listOpportunitiesForAdmin(status?: OpportunityStatus) {
  return db.opportunity.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { alumni: { select: { id: true, fullName: true, email: true } }, reviewedBy: { select: { name: true } } },
    take: 200,
  });
}

export async function getOpportunityForAdmin(id: string) {
  return db.opportunity.findUnique({
    where: { id },
    include: {
      alumni: { select: { id: true, fullName: true, email: true, graduationYear: true, programme: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}

export async function countPendingOpportunities(): Promise<number> {
  return db.opportunity.count({ where: { status: "PENDING" } });
}

export async function reviewOpportunity(params: {
  id: string;
  admin: Pick<AdminUser, "id" | "name">;
  decision: "APPROVE" | "REJECT";
  note: string | null;
}) {
  const { id, admin, decision, note } = params;
  const opportunity = await db.opportunity.findUnique({ where: { id }, include: { alumni: true } });
  if (!opportunity) throw new OpportunityError("That posting couldn't be found.");
  if (opportunity.status !== "PENDING") throw new OpportunityError("This posting has already been reviewed.");

  const { count } = await db.opportunity.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });
  if (count === 0) throw new OpportunityError("This posting has already been reviewed.");

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: decision === "APPROVE" ? "APPROVE_OPPORTUNITY" : "REJECT_OPPORTUNITY",
      entityType: "Opportunity",
      entityId: id,
      newValue: { title: opportunity.title, organization: opportunity.organization },
      note,
    },
  });

  if (opportunity.alumni) {
    await notifyAlumniOfOpportunityDecision({
      alumni: opportunity.alumni,
      opportunity,
      approved: decision === "APPROVE",
      note,
    });
  }
}
