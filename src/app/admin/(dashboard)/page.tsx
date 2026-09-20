import { Children } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  Newspaper,
  CalendarDays,
  BookOpen,
  Vote,
  Mail,
  Scale,
  Wallet,
  LifeBuoy,
  BriefcaseBusiness,
  Radio,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { WelcomeGreeting } from "@/components/ui/WelcomeGreeting";
import { getDashboardCounts, listAuditLog } from "@/lib/services/notification-service";
import { capabilitiesOf, requireAdminUser } from "@/lib/auth/admin";
import { getCurrentAcademicYear, getDuesCollectionRate } from "@/lib/services/dues-service";

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

/**
 * One labelled row of the dashboard: four boxes of equal size. A row with
 * nothing in it for this administrator is left out rather than showing an
 * empty heading.
 */
function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) {
  const boxes = Children.toArray(children).filter(Boolean);
  if (boxes.length === 0) return null;
  return (
    <section aria-label={title} className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate mb-2.5">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{boxes}</div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const academicYear = getCurrentAcademicYear();
  const [admin, counts, recentActivity, dues] = await Promise.all([
    requireAdminUser(),
    getDashboardCounts(),
    listAuditLog(10),
    getDuesCollectionRate(academicYear),
  ]);

  // Each box links somewhere; an administrator without that capability
  // would only be sent to a refusal, so the box isn't shown to them.
  const capabilities = capabilitiesOf(admin);
  const can = (capability: string) => capabilities.has(capability);

  return (
    <div>
      <WelcomeGreeting firstName={admin.name.split(" ")[0]} className="mb-5" />
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Dashboard</h1>
      <p className="text-sm text-slate mb-8">An overview of everything happening across the portal.</p>

      {/* Three rows of four equal boxes, one row per kind of number. Each
          count appears exactly once: the "waiting on you" row is the queues
          themselves, rather than a total that repeats them. */}
      <DashboardSection title="Waiting on you">
        {can("members.applications") && (
          <StatCard
            icon={ClipboardList}
            label="Pending Applications"
            detail="Membership applications to review"
            value={counts.pendingApplications}
            href="/admin/membership-applications?status=PENDING"
            accent={counts.pendingApplications > 0}
          />
        )}
        {can("support.requests") && (
          <StatCard
            icon={LifeBuoy}
            label="Support Requests"
            detail="Assistive tech, note-takers, welfare"
            value={counts.pendingSupport}
            href="/admin/support-requests?status=OPEN"
            accent={counts.pendingSupport > 0}
          />
        )}
        {can("messages.broadcasts") && (
          <StatCard
            icon={Radio}
            label="Broadcasts to Approve"
            detail="Written by patrons"
            value={counts.pendingBroadcasts}
            href="/admin/patrons/broadcasts?status=PENDING"
            accent={counts.pendingBroadcasts > 0}
          />
        )}
        {can("support.opportunities") && (
          <StatCard
            icon={BriefcaseBusiness}
            label="Postings to Review"
            detail="Jobs and internships from alumni"
            value={counts.pendingOpportunities}
            href="/admin/opportunities?status=PENDING"
            accent={counts.pendingOpportunities > 0}
          />
        )}
      </DashboardSection>

      <DashboardSection title="The association">
        {can("members.records") && (
          <StatCard
            icon={Users}
            label="Total Members"
            detail="Students on the roll"
            value={counts.totalMembers}
            href="/admin/members"
          />
        )}
        {can("finance.dues") && (
          <StatCard
            icon={Wallet}
            label="Dues Collected"
            detail={`${dues.paid} of ${dues.owing} paid · ${academicYear}`}
            value={`${dues.percent}%`}
            href="/admin/dues"
          />
        )}
        {can("support.barriers") && (
          <StatCard
            icon={Scale}
            label="Unresolved Barriers"
            detail="Reported by students"
            value={counts.openReports}
            href="/admin/advocacy?status=OPEN"
            accent={counts.openReports > 0}
          />
        )}
        {can("messages.contact") && (
          <StatCard
            icon={Mail}
            label="New Messages"
            detail="From the contact form"
            value={counts.newMessages}
            href="/admin/contact-messages"
            accent={counts.newMessages > 0}
          />
        )}
      </DashboardSection>

      <DashboardSection title="The website">
        {can("content.news") && (
          <StatCard icon={Newspaper} label="News Articles" detail="Published and drafts" value={counts.newsCount} href="/admin/news" />
        )}
        {can("content.events") && (
          <StatCard
            icon={CalendarDays}
            label="Upcoming Events"
            detail={`${counts.pastEvents} past event${counts.pastEvents === 1 ? "" : "s"}`}
            value={counts.upcomingEvents}
            href="/admin/events"
          />
        )}
        {can("library.documents") && (
          <StatCard
            icon={BookOpen}
            label="Library Documents"
            detail="In the resource library"
            value={counts.libraryDocuments}
            href="/admin/library"
          />
        )}
        {can("elections.manage") && (
          <StatCard
            icon={Vote}
            label="Active Elections"
            detail="Published elections"
            value={counts.activeElections}
            href="/admin/elections"
          />
        )}
      </DashboardSection>

      <div className="mt-4 bg-white rounded-lg border border-line">
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
