import "server-only";
import { db } from "@/lib/db";
import type { BroadcastAudience, BroadcastStatus, PatronProfile, Prisma } from "@/generated/prisma/client";
import { sanitizeRichText } from "@/components/ui/RichText";
import { sendBatchEmails } from "@/lib/email/client";
import { patronBroadcastEmail } from "@/lib/email/templates";
import { getEmailBrand } from "@/lib/services/content-service";
import { firstNameOf, patronSalutation } from "@/lib/services/account-notification-service";
import {
  notifyAdminsOfBroadcast,
  notifyPatronBroadcastDecision,
} from "@/lib/services/patron-portal-notification-service";
import { broadcastAudienceLabel } from "@/lib/patron-portal-options";
import type { AdoptedUpload } from "@/lib/services/enrollment-upload-service";
import { deleteObject } from "@/lib/storage/r2";
import { listAllyRecipients } from "@/lib/services/ally-service";

/**
 * Patrons' broadcasts: written in the Patrons' Portal, approved (or not) by
 * an administrator, then posted to the chosen portals and emailed to the
 * chosen group. Nothing reaches a member before approval.
 */

export class BroadcastReviewError extends Error {}

export function broadcastAuthorName(patron: Pick<PatronProfile, "title" | "fullName">): string {
  return [patron.title, patron.fullName].filter(Boolean).join(" ");
}

export async function createBroadcast(params: {
  patron: Pick<PatronProfile, "id" | "title" | "fullName">;
  audience: BroadcastAudience;
  subject: string;
  bodyHtml: string;
  sendEmail: boolean;
  postToPortal: boolean;
  attachment: (AdoptedUpload & { name: string }) | null;
}) {
  const { patron, attachment } = params;
  const broadcast = await db.broadcast.create({
    data: {
      patronId: patron.id,
      authorName: broadcastAuthorName(patron),
      audience: params.audience,
      subject: params.subject,
      bodyHtml: sanitizeRichText(params.bodyHtml),
      sendEmail: params.sendEmail,
      postToPortal: params.postToPortal,
      attachmentKey: attachment?.objectKey ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mimeType ?? null,
      attachmentSize: attachment?.fileSize ?? null,
    },
  });
  await notifyAdminsOfBroadcast(broadcast);
  return broadcast;
}

export async function listBroadcastsForPatron(patronId: string) {
  return db.broadcast.findMany({
    where: { patronId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** A patron can withdraw a broadcast that hasn't been reviewed yet. */
export async function withdrawBroadcast(params: { patronId: string; broadcastId: string }): Promise<boolean> {
  const broadcast = await db.broadcast.findFirst({
    where: { id: params.broadcastId, patronId: params.patronId, status: "PENDING" },
  });
  if (!broadcast) return false;
  const { count } = await db.broadcast.deleteMany({ where: { id: broadcast.id, status: "PENDING" } });
  if (count > 0 && broadcast.attachmentKey) {
    try {
      await deleteObject(broadcast.attachmentKey);
    } catch (err) {
      console.error("[broadcasts] could not remove a withdrawn attachment", broadcast.attachmentKey, err);
    }
  }
  return count > 0;
}

/**
 * The patrons' broadcasts, for the approval queue. Scoped to patron-written
 * ones: an executive's own broadcast never needs approving, so listing it
 * here would only clutter the queue with rows nobody can act on.
 */
export async function listBroadcastsForAdmin(status?: BroadcastStatus) {
  return db.broadcast.findMany({
    where: { patronId: { not: null }, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { name: true } } },
    take: 200,
  });
}

export async function countBroadcastsByStatus(): Promise<Record<BroadcastStatus, number>> {
  const groups = await db.broadcast.groupBy({
    by: ["status"],
    where: { patronId: { not: null } },
    _count: { _all: true },
  });
  const counts: Record<BroadcastStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

export async function getBroadcastForAdmin(id: string) {
  return db.broadcast.findUnique({
    where: { id },
    include: {
      patron: { select: { id: true, title: true, fullName: true, email: true, phone: true, status: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------

export interface BroadcastRecipient {
  email: string;
  firstName: string;
  /** Set for allies, whose every email must let them leave the list. */
  unsubscribeUrl?: string;
}

/** Members who currently count as enrolled students (not graduated). */
const CURRENT_STUDENT: Prisma.MemberWhereInput = { status: "ACTIVE", graduatedAt: null };

/**
 * Everyone a broadcast to `audience` goes to, one entry per email address.
 * Suspended members and alumni are left out.
 */
export async function resolveBroadcastRecipients(audience: BroadcastAudience): Promise<BroadcastRecipient[]> {
  const byEmail = new Map<string, BroadcastRecipient>();
  const add = (email: string | null | undefined, firstName: string) => {
    const key = email?.trim().toLowerCase();
    if (key && !byEmail.has(key)) byEmail.set(key, { email: email!.trim(), firstName });
  };

  if (audience === "STUDENTS" || audience === "ALL_MEMBERS") {
    const students = await db.member.findMany({ where: CURRENT_STUDENT, select: { email: true, firstName: true } });
    students.forEach((s) => add(s.email, s.firstName));
  }
  if (audience === "ALUMNI" || audience === "ALL_MEMBERS") {
    const alumni = await db.alumniProfile.findMany({ where: { status: "ACTIVE" }, select: { email: true, fullName: true } });
    alumni.forEach((a) => add(a.email, firstNameOf(a.fullName)));
  }
  if (audience === "EXECUTIVES") {
    const executives = await db.teamMember.findMany({
      where: { type: "LEADERSHIP", isActive: true, member: { status: "ACTIVE" } },
      select: { member: { select: { email: true, firstName: true } } },
    });
    executives.forEach((e) => e.member && add(e.member.email, e.member.firstName));
  }
  if (audience === "ALLIES") {
    // Confirmed and still subscribed only — see ally-service.
    const allies = await listAllyRecipients();
    for (const ally of allies) {
      const key = ally.email.toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, ally);
    }
  }
  if (audience === "PATRONS") {
    const patrons = await db.patronProfile.findMany({
      where: { status: "APPROVED" },
      select: { email: true, title: true, fullName: true },
    });
    patrons.forEach((p) => add(p.email, patronSalutation(p)));
  }
  return [...byEmail.values()];
}

export async function countBroadcastRecipients(audience: BroadcastAudience): Promise<number> {
  return (await resolveBroadcastRecipients(audience)).length;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

function siteUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

interface SendableBroadcast {
  id: string;
  subject: string;
  bodyHtml: string;
  authorName: string;
  audience: BroadcastAudience;
  sendEmail: boolean;
  postToPortal: boolean;
  attachmentKey: string | null;
  attachmentName: string | null;
  /** Set when an executive wrote it rather than a patron. */
  createdByAdminId: string | null;
}

/**
 * Emails one approved broadcast to its group and records how many got
 * through. Shared by the patron path (an administrator approves it) and the
 * executive path (an administrator writes it), so a broadcast reads and
 * arrives exactly the same either way.
 *
 * A failure here is logged, not thrown: the broadcast is already approved,
 * and losing the portal copy because an email provider hiccupped would be
 * the worse outcome.
 */
async function deliverBroadcastEmails(broadcast: SendableBroadcast, recipients: BroadcastRecipient[]): Promise<number> {
  if (!broadcast.sendEmail || recipients.length === 0) return 0;

  let emailsSent = 0;
  try {
    const brand = await getEmailBrand();
    const attachmentUrl =
      broadcast.attachmentKey && broadcast.attachmentName
        ? siteUrl(`/api/broadcasts/${broadcast.id}/attachment`)
        : null;
    const audienceLabel = broadcastAudienceLabel(broadcast.audience);
    const messages = recipients.map((r) => {
      const { subject, html } = patronBroadcastEmail({
        firstName: r.firstName,
        subject: broadcast.subject,
        bodyHtml: broadcast.bodyHtml,
        authorName: broadcast.authorName,
        audienceLabel,
        sender: broadcast.createdByAdminId ? "executive" : "patron",
        attachment: attachmentUrl && broadcast.attachmentName ? { url: attachmentUrl, name: broadcast.attachmentName } : null,
        // Allies have no portal to open.
        portalUrl: broadcast.postToPortal && !r.unsubscribeUrl ? siteUrl("/login") : null,
        unsubscribeUrl: r.unsubscribeUrl ?? null,
        brand,
      });
      return { to: r.email, subject, html };
    });
    ({ delivered: emailsSent } = await sendBatchEmails({
      messages,
      template: "patron-broadcast",
      entityType: "Broadcast",
      entityId: broadcast.id,
    }));
  } catch (err) {
    console.error("[broadcasts] sending the broadcast emails failed", broadcast.id, err);
  }
  await db.broadcast.update({ where: { id: broadcast.id }, data: { emailsSent } });
  return emailsSent;
}

/**
 * An executive's own broadcast. There is nobody above the executive board to
 * approve it, so it is created already approved and goes out immediately —
 * the audit log is what holds them to account for it afterwards.
 */
export async function sendAdminBroadcast(params: {
  admin: { id: string; name: string };
  /** How the sender is introduced to members, e.g. "General Secretary". */
  authorName: string;
  audience: BroadcastAudience;
  subject: string;
  bodyHtml: string;
  sendEmail: boolean;
  postToPortal: boolean;
  attachment: (AdoptedUpload & { name: string }) | null;
}) {
  const { admin, attachment } = params;
  const recipients = await resolveBroadcastRecipients(params.audience);
  const now = new Date();

  const broadcast = await db.broadcast.create({
    data: {
      createdByAdminId: admin.id,
      authorName: params.authorName,
      audience: params.audience,
      subject: params.subject,
      bodyHtml: sanitizeRichText(params.bodyHtml),
      sendEmail: params.sendEmail,
      postToPortal: params.postToPortal,
      attachmentKey: attachment?.objectKey ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mimeType ?? null,
      attachmentSize: attachment?.fileSize ?? null,
      status: "APPROVED",
      reviewedById: admin.id,
      reviewedAt: now,
      sentAt: now,
      recipientCount: recipients.length,
    },
  });

  const emailsSent = await deliverBroadcastEmails(broadcast, recipients);

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "SEND_BROADCAST",
      entityType: "Broadcast",
      entityId: broadcast.id,
      newValue: {
        audience: broadcast.audience,
        subject: broadcast.subject,
        recipients: recipients.length,
        emailsSent,
        postToPortal: broadcast.postToPortal,
      },
    },
  });

  return { broadcast, recipients: recipients.length, emailsSent };
}

/** Broadcasts the executives sent themselves, newest first. */
export async function listAdminBroadcasts() {
  return db.broadcast.findMany({
    where: { createdByAdminId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { createdByAdmin: { select: { name: true } } },
    take: 100,
  });
}

export async function approveBroadcast(params: { id: string; adminId: string; note: string | null }) {
  const broadcast = await db.broadcast.findUnique({
    where: { id: params.id },
    include: { patron: { select: { id: true, email: true, title: true, fullName: true } } },
  });
  if (!broadcast) throw new BroadcastReviewError("That broadcast no longer exists.");
  if (broadcast.status !== "PENDING") throw new BroadcastReviewError("This broadcast has already been reviewed.");

  const recipients = await resolveBroadcastRecipients(broadcast.audience);
  const now = new Date();
  // Guarded on PENDING, so two admins approving at once can't send twice.
  const { count } = await db.broadcast.updateMany({
    where: { id: broadcast.id, status: "PENDING" },
    data: {
      status: "APPROVED",
      reviewedById: params.adminId,
      reviewedAt: now,
      reviewNote: params.note,
      sentAt: now,
      recipientCount: recipients.length,
    },
  });
  if (count === 0) throw new BroadcastReviewError("This broadcast has already been reviewed.");

  const emailsSent = await deliverBroadcastEmails(broadcast, recipients);

  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "APPROVE_BROADCAST",
      entityType: "Broadcast",
      entityId: broadcast.id,
      newValue: {
        audience: broadcast.audience,
        subject: broadcast.subject,
        recipients: recipients.length,
        emailsSent,
        postToPortal: broadcast.postToPortal,
      },
      note: params.note,
    },
  });

  if (broadcast.patron) {
    await notifyPatronBroadcastDecision({
      patron: broadcast.patron,
      broadcast,
      approved: true,
      note: params.note,
      recipientCount: recipients.length,
    });
  }
  return { recipients: recipients.length, emailsSent, sendEmail: broadcast.sendEmail };
}

export async function rejectBroadcast(params: { id: string; adminId: string; note: string }) {
  const broadcast = await db.broadcast.findUnique({
    where: { id: params.id },
    include: { patron: { select: { id: true, email: true, title: true, fullName: true } } },
  });
  if (!broadcast) throw new BroadcastReviewError("That broadcast no longer exists.");
  const { count } = await db.broadcast.updateMany({
    where: { id: broadcast.id, status: "PENDING" },
    data: { status: "REJECTED", reviewedById: params.adminId, reviewedAt: new Date(), reviewNote: params.note },
  });
  if (count === 0) throw new BroadcastReviewError("This broadcast has already been reviewed.");

  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "REJECT_BROADCAST",
      entityType: "Broadcast",
      entityId: broadcast.id,
      newValue: { audience: broadcast.audience, subject: broadcast.subject },
      note: params.note,
    },
  });
  if (broadcast.patron) {
    await notifyPatronBroadcastDecision({ patron: broadcast.patron, broadcast, approved: false, note: params.note });
  }
}

// ---------------------------------------------------------------------------
// Announcements in the portals
// ---------------------------------------------------------------------------

const ANNOUNCEMENT_SELECT = {
  id: true,
  subject: true,
  bodyHtml: true,
  authorName: true,
  audience: true,
  sentAt: true,
  attachmentKey: true,
  attachmentName: true,
} as const;

export type Announcement = Prisma.BroadcastGetPayload<{ select: typeof ANNOUNCEMENT_SELECT }>;

/** Approved portal announcements a signed-in student can see. */
export async function listAnnouncementsForMember(memberId: string, take = 20): Promise<Announcement[]> {
  const isExecutive = await db.teamMember.count({ where: { memberId, type: "LEADERSHIP", isActive: true } });
  const audiences: BroadcastAudience[] = ["ALL_MEMBERS", "STUDENTS", ...(isExecutive ? (["EXECUTIVES"] as const) : [])];
  return db.broadcast.findMany({
    where: { status: "APPROVED", postToPortal: true, audience: { in: audiences } },
    orderBy: { sentAt: "desc" },
    select: ANNOUNCEMENT_SELECT,
    take,
  });
}

/** Approved portal announcements for alumni. */
export async function listAnnouncementsForAlumni(take = 20): Promise<Announcement[]> {
  return db.broadcast.findMany({
    where: { status: "APPROVED", postToPortal: true, audience: { in: ["ALL_MEMBERS", "ALUMNI"] } },
    orderBy: { sentAt: "desc" },
    select: ANNOUNCEMENT_SELECT,
    take,
  });
}

/** Every approved announcement, for patrons (who see what their fellow patrons sent). */
export async function listAllAnnouncements(take = 20): Promise<Announcement[]> {
  return db.broadcast.findMany({
    where: { status: "APPROVED" },
    orderBy: { sentAt: "desc" },
    select: ANNOUNCEMENT_SELECT,
    take,
  });
}

/**
 * The stored attachment for a broadcast, if the viewer may have it: anyone
 * once the broadcast has been sent (it was emailed to the whole group), and
 * before that only its author or an administrator.
 */
export async function getBroadcastAttachment(params: {
  broadcastId: string;
  viewer: { kind: "admin" } | { kind: "patron"; patronId: string } | { kind: "anyone" };
}): Promise<{ key: string; name: string } | null> {
  const broadcast = await db.broadcast.findUnique({
    where: { id: params.broadcastId },
    select: { status: true, patronId: true, attachmentKey: true, attachmentName: true },
  });
  if (!broadcast?.attachmentKey) return null;
  const { viewer } = params;
  const allowed =
    broadcast.status === "APPROVED" ||
    viewer.kind === "admin" ||
    (viewer.kind === "patron" && viewer.patronId === broadcast.patronId);
  if (!allowed) return null;
  return { key: broadcast.attachmentKey, name: broadcast.attachmentName ?? "attachment" };
}
