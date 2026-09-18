import "server-only";
import { db } from "@/lib/db";
import type { AdminUser, BarrierReportStatus, IssueCategory, Member } from "@/generated/prisma/client";
import { OPEN_BARRIER_STATUSES } from "@/lib/portal-options";
import { deleteObject } from "@/lib/storage/r2";
import {
  notifyAdminsOfBarrierReport,
  notifyStudentOfReportUpdate,
} from "@/lib/services/portal-notification-service";

/**
 * Barrier reports: a student's own account of something on campus that shut
 * them out — a lift that's always locked, an exam venue up two flights of
 * stairs, a paper with no audio version.
 *
 * Two rules shape everything here. First, the report belongs to the student:
 * they see every note written on it, because a tracker that hides its
 * workings is worse than no tracker. Second, it stays with the executives —
 * what reaches the patrons is the de-identified summary an executive writes
 * when escalating (see escalateBarrierReport), never the student's name,
 * their photos or their voice note.
 */

export class BarrierReportError extends Error {}

export interface BarrierReportFields {
  title: string;
  description: string;
  category: IssueCategory;
  location: string | null;
  occurredOn: Date | null;
}

export interface ReportEvidence {
  objectKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const STUDENT_REPORT_INCLUDE = {
  attachments: { orderBy: { createdAt: "asc" } },
  updates: { orderBy: { createdAt: "asc" } },
  assignedTo: { select: { name: true } },
  escalatedIssue: { select: { id: true, title: true, status: true } },
} as const;

// ---------------------------------------------------------------------------
// The student's side
// ---------------------------------------------------------------------------

export async function createBarrierReport(params: {
  member: Pick<Member, "id" | "firstName" | "lastName" | "email" | "indexNumber">;
  fields: BarrierReportFields;
  evidence: ReportEvidence[];
}) {
  const { member, fields, evidence } = params;
  const report = await db.barrierReport.create({
    data: {
      memberId: member.id,
      ...fields,
      attachments: { create: evidence },
    },
    include: { attachments: true },
  });
  await notifyAdminsOfBarrierReport({ report, member });
  return report;
}

export async function listReportsForMember(memberId: string) {
  return db.barrierReport.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { attachments: true } },
      escalatedIssue: { select: { id: true, status: true } },
    },
    take: 100,
  });
}

export async function getReportForMember(params: { memberId: string; id: string }) {
  return db.barrierReport.findFirst({
    where: { id: params.id, memberId: params.memberId },
    include: STUDENT_REPORT_INCLUDE,
  });
}

export async function countOpenReportsForMember(memberId: string): Promise<number> {
  return db.barrierReport.count({ where: { memberId, status: { in: [...OPEN_BARRIER_STATUSES] } } });
}

/** A student can take back a report nobody has picked up yet. */
export async function withdrawReport(params: { memberId: string; id: string }): Promise<boolean> {
  const report = await db.barrierReport.findFirst({
    where: { id: params.id, memberId: params.memberId, status: "SUBMITTED" },
    include: { attachments: true },
  });
  if (!report) return false;
  const { count } = await db.barrierReport.deleteMany({ where: { id: report.id, status: "SUBMITTED" } });
  if (count === 0) return false;
  for (const attachment of report.attachments) {
    try {
      await deleteObject(attachment.objectKey);
    } catch (err) {
      console.error("[barrier-reports] could not remove a withdrawn attachment", attachment.objectKey, err);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// The executives' side
// ---------------------------------------------------------------------------

export async function listBarrierReports(params?: { status?: BarrierReportStatus; openOnly?: boolean }) {
  const where = params?.status
    ? { status: params.status }
    : params?.openOnly
      ? { status: { in: [...OPEN_BARRIER_STATUSES] } }
      : {};
  return db.barrierReport.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      member: { select: { id: true, firstName: true, lastName: true, indexNumber: true, level: true } },
      assignedTo: { select: { name: true } },
      _count: { select: { attachments: true, updates: true } },
    },
    take: 200,
  });
}

export async function countBarrierReportsByStatus(): Promise<Record<BarrierReportStatus, number>> {
  const groups = await db.barrierReport.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<BarrierReportStatus, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    IN_PROGRESS: 0,
    ESCALATED: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

export async function countOpenBarrierReports(): Promise<number> {
  return db.barrierReport.count({ where: { status: { in: [...OPEN_BARRIER_STATUSES] } } });
}

export async function getBarrierReportForAdmin(id: string) {
  return db.barrierReport.findUnique({
    where: { id },
    include: {
      ...STUDENT_REPORT_INCLUDE,
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
          academicDepartment: true,
        },
      },
    },
  });
}

/**
 * Moves a report along and writes the note the student will read. Assigning
 * it to a colleague and moving the status are the same action deliberately:
 * a status change with no explanation is what makes a tracker useless.
 */
export async function addBarrierReportUpdate(params: {
  id: string;
  admin: Pick<AdminUser, "id" | "name">;
  status: BarrierReportStatus;
  note: string;
  assignedToId: string | null;
}) {
  const { id, admin, status, note, assignedToId } = params;
  const report = await db.barrierReport.findUnique({ where: { id }, include: { member: true } });
  if (!report) throw new BarrierReportError("That report couldn't be found.");
  if (report.status === "ESCALATED" && status !== "ESCALATED" && status !== "RESOLVED" && status !== "CLOSED") {
    throw new BarrierReportError("This report is with the patrons. Resolve or close it rather than moving it back.");
  }

  const resolved = status === "RESOLVED";
  const updated = await db.barrierReport.update({
    where: { id },
    data: {
      status,
      assignedToId: assignedToId ?? report.assignedToId,
      resolutionNote: resolved ? note : report.resolutionNote,
      resolvedAt: resolved ? (report.resolvedAt ?? new Date()) : null,
      updates: { create: { adminId: admin.id, authorName: admin.name, body: note, status } },
    },
    include: { member: true },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_BARRIER_REPORT",
      entityType: "BarrierReport",
      entityId: id,
      previousValue: { status: report.status },
      newValue: { status },
      note,
    },
  });

  await notifyStudentOfReportUpdate({ report: updated, member: updated.member, status, note });
  return updated;
}

/**
 * Escalates a report to the patrons by writing a separate, de-identified
 * AccessibilityIssue and linking the two. The student's name, contact
 * details and evidence stay on this side of the line — the patrons see the
 * summary an executive wrote and nothing else.
 */
export async function escalateBarrierReport(params: {
  id: string;
  admin: Pick<AdminUser, "id" | "name">;
  issue: { title: string; summary: string; category: IssueCategory; location: string | null };
}) {
  const { id, admin, issue } = params;
  const report = await db.barrierReport.findUnique({ where: { id }, include: { member: true } });
  if (!report) throw new BarrierReportError("That report couldn't be found.");
  if (report.escalatedIssueId) throw new BarrierReportError("This report has already been escalated.");

  const created = await db.accessibilityIssue.create({
    data: {
      ...issue,
      status: "UNDER_REVIEW",
      reportedOn: report.createdAt,
      createdById: admin.id,
    },
  });

  const note = `Escalated to the association's patrons as "${created.title}".`;
  const updated = await db.barrierReport.update({
    where: { id },
    data: {
      status: "ESCALATED",
      escalatedIssueId: created.id,
      updates: { create: { adminId: admin.id, authorName: admin.name, body: note, status: "ESCALATED" } },
    },
    include: { member: true },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "ESCALATE_BARRIER_REPORT",
      entityType: "BarrierReport",
      entityId: id,
      newValue: { issueId: created.id, title: created.title },
    },
  });

  await notifyStudentOfReportUpdate({ report: updated, member: updated.member, status: "ESCALATED", note });
  return created;
}

/**
 * The stored evidence file, if the viewer may have it: the student who filed
 * the report, or an administrator. Nobody else, ever — these are photos and
 * voice notes of someone's worst day on campus.
 */
export async function getReportEvidence(params: {
  attachmentId: string;
  viewer: { kind: "admin" } | { kind: "member"; memberId: string };
}): Promise<{ objectKey: string; fileName: string; mimeType: string } | null> {
  const attachment = await db.barrierReportAttachment.findUnique({
    where: { id: params.attachmentId },
    include: { report: { select: { memberId: true } } },
  });
  if (!attachment) return null;
  if (params.viewer.kind === "member" && attachment.report.memberId !== params.viewer.memberId) return null;
  return { objectKey: attachment.objectKey, fileName: attachment.fileName, mimeType: attachment.mimeType };
}
