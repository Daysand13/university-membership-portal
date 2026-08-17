import "server-only";
import { db } from "@/lib/db";

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

export async function getDashboardCounts() {
  const [
    totalMembers,
    pendingApplications,
    approvedApplications,
    newsCount,
    upcomingEvents,
    pastEvents,
    libraryDocuments,
    activeElections,
    newMessages,
  ] = await Promise.all([
    db.member.count(),
    db.membershipApplication.count({ where: { status: "PENDING" } }),
    db.membershipApplication.count({ where: { status: "APPROVED" } }),
    db.news.count(),
    db.event.count({ where: { status: "PUBLISHED", endDate: { gte: new Date() } } }),
    db.event.count({ where: { status: "PUBLISHED", endDate: { lt: new Date() } } }),
    db.document.count(),
    db.election.count({ where: { status: "PUBLISHED" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  return {
    totalMembers,
    pendingApplications,
    approvedApplications,
    newsCount,
    upcomingEvents,
    pastEvents,
    libraryDocuments,
    activeElections,
    newMessages,
  };
}
