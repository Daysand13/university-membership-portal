import { WelcomeGreeting } from "@/components/ui/WelcomeGreeting";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarDays,
  GraduationCap,
  HandCoins,
  HandHeart,
  Megaphone,
  Scale,
  Send,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";
import { patronSalutation } from "@/lib/services/account-notification-service";
import { getMembershipGrowth, getMembershipOverview } from "@/lib/services/patron-insights-service";
import { getFinanceTotals, getMonthlyFinances } from "@/lib/services/patron-finance-service";
import { getAdvocacyCounts, listCampaigns, listIssues } from "@/lib/services/advocacy-service";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { UpcomingEventsList } from "@/components/portal/UpcomingEventsList";
import { StatTile, IssueStageTracker } from "@/components/patron-portal/Display";
import { QuickBroadcastPanel } from "@/components/patron-portal/BroadcastComposer";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { LineChart } from "@/components/charts/LineChart";
import { formatCedis, issueStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Patrons' Portal" };
export const dynamic = "force-dynamic";

const footerLinkClasses = "inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600";
const count = new Intl.NumberFormat("en-GH");

export default async function PatronDashboardPage() {
  const patron = await requirePatron();
  const [membership, growth, totals, months, advocacy, campaigns, issues, events] = await Promise.all([
    getMembershipOverview(),
    getMembershipGrowth(6),
    getFinanceTotals(),
    getMonthlyFinances(6),
    getAdvocacyCounts(),
    listCampaigns({ status: "ACTIVE", patronId: patron.id }),
    listIssues({ openOnly: true, take: 3 }),
    getUpcomingEventsForHome(3),
  ]);

  return (
    <div className="space-y-6">
      <WelcomeGreeting firstName={patronSalutation(patron)} />
      <section aria-labelledby="welcome-heading" className="rounded-xl bg-primary-900 text-white p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <span className="w-14 h-14 rounded-full border-2 border-white/30 bg-primary-800 flex items-center justify-center shrink-0">
            <Award size={26} aria-hidden="true" className="text-primary-100" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="welcome-heading" className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight">
              Welcome back, {patronSalutation(patron)}
            </h1>
            <p className="text-[15px] text-primary-100 mt-1">
              Empowering Students with Special Needs Through Advocacy and Support
            </p>
            {/* Same colours as the patron badges elsewhere; set directly because
                the banner is dark in both themes. */}
            <p
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: "#f7b267", color: "#1b1440" }}
            >
              <Award size={15} aria-hidden="true" /> Patron of the Association
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <Link
              href="/patrons/dashboard/messages?tab=broadcast#compose"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Send size={16} aria-hidden="true" /> New Broadcast
            </Link>
            <Link
              href="/patrons/dashboard/finances#give"
              className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "#f7b267", color: "#1b1440" }}
            >
              <HandHeart size={16} aria-hidden="true" /> Make a Donation
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Key figures" className="grid gap-3 grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatTile
          label="Total Members"
          value={count.format(membership.totalMembers)}
          detail="Students and alumni, each counted once"
          icon={<Users size={18} />}
          href="/patrons/dashboard/membership"
        />
        <StatTile
          label="Enrolled Students"
          value={count.format(membership.students)}
          detail={
            membership.students === membership.activeStudents
              ? "Currently enrolled"
              : `${count.format(membership.activeStudents)} active, the rest suspended`
          }
          icon={<TrendingUp size={18} />}
          href="/patrons/dashboard/membership"
        />
        <StatTile
          label="Alumni Network"
          value={count.format(membership.alumni)}
          detail={`${count.format(membership.mentors)} offering mentorship${
            membership.dualMembers > 0 ? `, ${count.format(membership.dualMembers)} studying again` : ""
          }`}
          icon={<GraduationCap size={18} />}
          href="/patrons/dashboard/membership#directory"
        />
        <StatTile
          label="Total Funds Raised"
          value={formatCedis(totals.raised)}
          detail="Dues and donations"
          icon={<Wallet size={18} />}
          href="/patrons/dashboard/finances"
        />
        <StatTile
          label="Active Advocacy Campaigns"
          value={count.format(advocacy.activeCampaigns)}
          detail={`${count.format(advocacy.openIssues)} open escalated issue${advocacy.openIssues === 1 ? "" : "s"}`}
          icon={<Scale size={18} />}
          href="/patrons/dashboard/advocacy"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard
          id="growth-chart"
          title="Membership Growth"
          icon={<TrendingUp size={20} />}
          footer={
            <Link href="/patrons/dashboard/membership" className={footerLinkClasses}>
              Membership network <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p className="text-sm text-slate mb-3">New students by year of admission, and new alumni by graduation year.</p>
          <LineChart
            label="Membership growth: new students and new alumni per year"
            categories={growth.map((g) => String(g.year))}
            series={[
              { key: "students", label: "Students", color: "var(--viz-students)", values: growth.map((g) => g.students) },
              { key: "alumni", label: "Alumni", color: "var(--viz-alumni)", values: growth.map((g) => g.alumni) },
            ]}
            formatValue={(n) => count.format(n)}
            minWidth={460}
          />
        </DashboardCard>

        <DashboardCard
          id="finance-chart"
          title="Financial Overview"
          icon={<HandCoins size={20} />}
          footer={
            <Link href="/patrons/dashboard/finances" className={footerLinkClasses}>
              Finances & support <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p className="text-sm text-slate mb-3">Dues and donations received over the last six months.</p>
          <ColumnChart
            label="Money received per month over the last six months, by source"
            categories={months.map((m) => m.label)}
            bars={[
              {
                key: "income",
                label: "Received",
                series: [
                  { key: "dues", label: "Dues", color: "var(--viz-dues)" },
                  { key: "patronDonations", label: "Patron donations", color: "var(--viz-patron)" },
                  { key: "otherDonations", label: "Other donations", color: "var(--viz-other)" },
                ],
              },
            ]}
            values={{
              dues: months.map((m) => m.dues),
              patronDonations: months.map((m) => m.patronDonations),
              otherDonations: months.map((m) => m.otherDonations),
            }}
            formatValue={(n) => formatCedis(n)}
            formatTick={(n) => formatCedis(n, { compact: true })}
            minWidth={460}
          />
        </DashboardCard>

        <DashboardCard id="quick-broadcast" title="Quick Broadcast" icon={<Megaphone size={20} />}>
          <QuickBroadcastPanel />
        </DashboardCard>

        <DashboardCard
          id="advocacy-alerts"
          title="Rights & Advocacy Alerts"
          icon={<Scale size={20} />}
          readAloud
          footer={
            <Link href="/patrons/dashboard/advocacy" className={footerLinkClasses}>
              View all campaigns <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {campaigns.length === 0 && issues.length === 0 ? (
            <p className="text-slate">There are no active campaigns or escalated issues right now.</p>
          ) : (
            <ul className="space-y-4">
              {campaigns.slice(0, 3).map((campaign) => (
                <li key={campaign.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate">Campaign</p>
                  <Link
                    href={`/patrons/dashboard/advocacy/campaigns/${campaign.id}`}
                    className="font-semibold text-primary-950 hover:text-accent-600"
                  >
                    {campaign.title}
                  </Link>
                  <p className="text-sm text-slate">
                    {campaign.endorsementCount} patron endorsement{campaign.endorsementCount === 1 ? "" : "s"}
                    {campaign.endorsedByMe && " · including yours"}
                  </p>
                </li>
              ))}
              {issues.map((issue) => (
                <li key={issue.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate">Escalated issue</p>
                  <Link
                    href={`/patrons/dashboard/advocacy/issues/${issue.id}`}
                    className="font-semibold text-primary-950 hover:text-accent-600"
                  >
                    {issue.title}
                  </Link>
                  <p className="text-sm text-slate mb-1.5">{issueStatusLabel(issue.status)}</p>
                  <IssueStageTracker status={issue.status} compact />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          id="patron-events"
          title="Upcoming Events"
          icon={<CalendarDays size={20} />}
          readAloud
          className="xl:col-span-2"
          footer={
            <Link href="/patrons/dashboard/events" className={footerLinkClasses}>
              All events <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <UpcomingEventsList events={events} emptyText="No upcoming events have been announced yet." />
        </DashboardCard>
      </div>
    </div>
  );
}
