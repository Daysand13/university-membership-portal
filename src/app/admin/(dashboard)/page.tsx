import Link from "next/link";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  Newspaper,
  CalendarDays,
  CalendarCheck2,
  BookOpen,
  Vote,
  Mail,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { getDashboardCounts, listAuditLog } from "@/lib/services/notification-service";

export const metadata = { title: "Dashboard" };

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function describeAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default async function AdminDashboardPage() {
  const [counts, recentActivity] = await Promise.all([getDashboardCounts(), listAuditLog(10)]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Dashboard</h1>
      <p className="text-sm text-slate mb-8">An overview of everything happening across the portal.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Members" value={counts.totalMembers} href="/admin/members" />
        <StatCard
          icon={ClipboardList}
          label="Pending Applications"
          value={counts.pendingApplications}
          href="/admin/membership-applications?status=PENDING"
          accent={counts.pendingApplications > 0}
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved Members"
          value={counts.approvedApplications}
          href="/admin/membership-applications?status=APPROVED"
        />
        <StatCard icon={Newspaper} label="News Articles" value={counts.newsCount} href="/admin/news" />
        <StatCard
          icon={CalendarDays}
          label="Upcoming Events"
          value={counts.upcomingEvents}
          href="/admin/events"
        />
        <StatCard icon={CalendarCheck2} label="Past Events" value={counts.pastEvents} href="/admin/events" />
        <StatCard icon={BookOpen} label="Library Documents" value={counts.libraryDocuments} href="/admin/library" />
        <StatCard icon={Vote} label="Active Elections" value={counts.activeElections} href="/admin/elections" />
        <StatCard
          icon={Mail}
          label="New Messages"
          value={counts.newMessages}
          href="/admin/contact-messages"
          accent={counts.newMessages > 0}
        />
      </div>

      <div className="mt-10 bg-white rounded-lg border border-line">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-primary-950">Recent Activity</h2>
          <Link href="/admin/audit-log" className="text-xs font-semibold text-primary-800 hover:text-accent-600">
            View full audit log
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate text-center py-10">No admin activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentActivity.map((log) => (
              <li key={log.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">
                    <span className="font-medium">{log.admin?.name ?? "System"}</span>{" "}
                    {describeAction(log.action).toLowerCase()}
                    {log.entityType && <span className="text-slate"> · {log.entityType}</span>}
                  </p>
                </div>
                <span className="text-xs text-slate-light shrink-0 font-data">{timeAgo(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
