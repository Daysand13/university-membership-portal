import "server-only";
import { db } from "@/lib/db";
import { ON_THE_ROLL } from "@/lib/services/membership-roll";

export async function getUnreadNotificationCount(): Promise<number> {
  return db.notification.count({ where: { isRead: false } });
}

export async function listRecentNotifications(limit = 8) {
  return db.notification.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

export async function markNotificationRead(id: string) {
  return db.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead() {
  return db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
}

export async function listAuditLog(limit = 100) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { name: true, email: true } } },
    take: limit,
  });
}

/**
 * The email trail, newest first — optionally only the ones concerning one
 * person.
 *
 * "They say they never got it" is answered here or nowhere: whether it was
 * attempted at all, whether the provider took it, and what it said if it
 * refused. Without a search, that answer is buried under whatever was sent
 * since, which for a portal this size is a few hundred messages a week.
 */
export async function listEmailLogs(limit = 200, search?: string) {
  const term = search?.trim();
  return db.emailLog.findMany({
    where: term
      ? {
          OR: [
            { to: { contains: term, mode: "insensitive" } },
            { subject: { contains: term, mode: "insensitive" } },
            { template: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** How many messages this address has ever been sent, and how they went. */
export async function emailHistoryFor(address: string) {
  const logs = await db.emailLog.findMany({
    where: { to: { equals: address.trim(), mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === "SENT").length,
    failed: logs.filter((l) => l.status === "FAILED").length,
    skipped: logs.filter((l) => l.status === "SKIPPED_NO_PROVIDER").length,
    logs,
  };
}

export async function getDashboardCounts() {
  const [
    totalMembers,
    pendingApplications,
    newsCount,
    upcomingEvents,
    pastEvents,
    libraryDocuments,
    activeElections,
    newMessages,
  ] = await Promise.all([
    // Matches what /admin/members itself shows — otherwise this stat card
    // and the page it links to would disagree with each other.
    db.member.count({ where: ON_THE_ROLL }),
    db.membershipApplication.count({ where: { status: "PENDING" } }),
    db.news.count(),
    db.event.count({ where: { status: "PUBLISHED", endDate: { gte: new Date() } } }),
    db.event.count({ where: { status: "PUBLISHED", endDate: { lt: new Date() } } }),
    db.document.count(),
    db.election.count({ where: { status: "PUBLISHED" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  // The executives' own operational numbers: what's waiting on somebody, and
  // what students are still blocked by.
  const [openReports, pendingSupport, pendingBroadcasts, pendingOpportunities] = await Promise.all([
    db.barrierReport.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "ESCALATED"] } } }),
    db.supportRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.broadcast.count({ where: { status: "PENDING" } }),
    db.opportunity.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalMembers,
    pendingApplications,
    newsCount,
    upcomingEvents,
    pastEvents,
    libraryDocuments,
    activeElections,
    newMessages,
    openReports,
    pendingSupport,
    pendingBroadcasts,
    pendingOpportunities,
  };
}
