import "server-only";
import { db } from "@/lib/db";
import type {
  AdminUser,
  ExpenseCategory,
  Member,
  SupportRequestStatus,
  SupportRequestType,
} from "@/generated/prisma/client";
import { OPEN_SUPPORT_STATUSES, SUPPORT_EXPENSE_CATEGORY } from "@/lib/portal-options";
import {
  notifyAdminsOfSupportRequest,
  notifyStudentOfSupportDecision,
} from "@/lib/services/portal-notification-service";

/**
 * Requests for help: a screen reader, a note-taker for lectures, or money
 * from the emergency welfare fund.
 *
 * A welfare payout is the one place where the Student Portal touches the
 * association's money, so it is deliberately two steps: an executive
 * approves the request, and then separately records the payment — which
 * writes an Expense against the welfare fund. That way the finance ledger
 * and the student's tracker can never disagree about what was actually paid.
 */

export class SupportRequestError extends Error {}

export interface SupportRequestFields {
  type: SupportRequestType;
  details: string;
  amountRequestedPesewas: number | null;
  neededBy: Date | null;
}

export async function createSupportRequest(params: {
  member: Pick<Member, "id" | "firstName" | "lastName" | "email" | "indexNumber" | "level">;
  fields: SupportRequestFields;
}) {
  const request = await db.supportRequest.create({
    data: { memberId: params.member.id, ...params.fields },
  });
  await notifyAdminsOfSupportRequest({ request, member: params.member });
  return request;
}

export async function listSupportRequestsForMember(memberId: string) {
  return db.supportRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { name: true } } },
    take: 100,
  });
}

export async function countOpenSupportRequestsForMember(memberId: string): Promise<number> {
  return db.supportRequest.count({ where: { memberId, status: { in: [...OPEN_SUPPORT_STATUSES] } } });
}

/** A student can take back a request nobody has looked at yet. */
export async function withdrawSupportRequest(params: { memberId: string; id: string }): Promise<boolean> {
  const { count } = await db.supportRequest.deleteMany({
    where: { id: params.id, memberId: params.memberId, status: "SUBMITTED" },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// The executives' side
// ---------------------------------------------------------------------------

export async function listSupportRequests(params?: { status?: SupportRequestStatus; openOnly?: boolean }) {
  const where = params?.status
    ? { status: params.status }
    : params?.openOnly
      ? { status: { in: [...OPEN_SUPPORT_STATUSES] } }
      : {};
  return db.supportRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, indexNumber: true, level: true } },
      reviewedBy: { select: { name: true } },
    },
    take: 200,
  });
}

export async function getSupportRequestForAdmin(id: string) {
  return db.supportRequest.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          indexNumber: true,
          level: true,
          programme: true,
          department: true,
        },
      },
      reviewedBy: { select: { name: true } },
      expense: true,
    },
  });
}

export async function countSupportRequestsByStatus(): Promise<Record<SupportRequestStatus, number>> {
  const groups = await db.supportRequest.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<SupportRequestStatus, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    DECLINED: 0,
    FULFILLED: 0,
  };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

export async function countPendingSupportRequests(): Promise<number> {
  return db.supportRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } });
}

/** Money approved but not yet paid out — what the exec dashboard warns about. */
export async function sumApprovedUnpaidPesewas(): Promise<number> {
  const result = await db.supportRequest.aggregate({
    where: { status: "APPROVED", expenseId: null },
    _sum: { approvedAmountPesewas: true },
  });
  return result._sum.approvedAmountPesewas ?? 0;
}

export async function reviewSupportRequest(params: {
  id: string;
  admin: Pick<AdminUser, "id" | "name">;
  decision: "APPROVE" | "DECLINE";
  note: string | null;
  approvedAmountPesewas: number | null;
}) {
  const { id, admin, decision, note, approvedAmountPesewas } = params;
  const request = await db.supportRequest.findUnique({ where: { id }, include: { member: true } });
  if (!request) throw new SupportRequestError("That request couldn't be found.");
  if (request.status === "FULFILLED") throw new SupportRequestError("This request has already been provided for.");

  const updated = await db.supportRequest.update({
    where: { id },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : "DECLINED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: note,
      approvedAmountPesewas: decision === "APPROVE" ? approvedAmountPesewas : null,
    },
    include: { member: true },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: decision === "APPROVE" ? "APPROVE_SUPPORT_REQUEST" : "DECLINE_SUPPORT_REQUEST",
      entityType: "SupportRequest",
      entityId: id,
      previousValue: { status: request.status },
      newValue: { status: updated.status, approvedAmountPesewas: updated.approvedAmountPesewas },
      note,
    },
  });

  await notifyStudentOfSupportDecision({ request: updated, member: updated.member });
  return updated;
}

/**
 * Records that an approved request has actually been met — with the money
 * spent, where money was involved. The Expense is what puts it in the
 * association's books; the link back is what lets the student see it was done.
 */
export async function recordSupportFulfilment(params: {
  id: string;
  admin: Pick<AdminUser, "id" | "name">;
  amountPesewas: number;
  description: string;
  spentOn: Date;
}) {
  const { id, admin, amountPesewas, description, spentOn } = params;
  const request = await db.supportRequest.findUnique({ where: { id }, include: { member: true } });
  if (!request) throw new SupportRequestError("That request couldn't be found.");
  if (request.status !== "APPROVED") throw new SupportRequestError("Approve the request before recording the payout.");
  if (request.expenseId) throw new SupportRequestError("A payout has already been recorded for this request.");

  const expense = await db.expense.create({
    data: {
      category: SUPPORT_EXPENSE_CATEGORY[request.type] as ExpenseCategory,
      description,
      amountPesewas,
      spentOn,
      recordedById: admin.id,
    },
  });

  const updated = await db.supportRequest.update({
    where: { id },
    data: { status: "FULFILLED", expenseId: expense.id, fulfilledAt: new Date() },
    include: { member: true },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "FULFIL_SUPPORT_REQUEST",
      entityType: "SupportRequest",
      entityId: id,
      newValue: { expenseId: expense.id, amountPesewas },
    },
  });

  await notifyStudentOfSupportDecision({ request: updated, member: updated.member });
  return updated;
}
