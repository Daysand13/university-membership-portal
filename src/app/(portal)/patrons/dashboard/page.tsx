import Link from "next/link";
import { ArrowRight, Award, CalendarDays, HandHeart, Megaphone, UserRound } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { getLatestNews } from "@/lib/services/news-service";
import { getUpcomingEventsForHome } from "@/lib/services/event-service";
import { patronSalutation } from "@/lib/services/account-notification-service";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { UpcomingEventsList } from "@/components/portal/UpcomingEventsList";

export const metadata = { title: "Patrons' Portal" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const footerLinkClasses = "inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600";

function BannerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-3 min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-primary-100">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-white break-words">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-sm text-slate sm:w-32 shrink-0">{label}</dt>
      <dd className="font-semibold text-primary-950 break-words min-w-0">{value}</dd>
    </div>
  );
}

export default async function PatronDashboardPage() {
  const patron = await requirePatron();
  const [news, events] = await Promise.all([getLatestNews(4), getUpcomingEventsForHome(3)]);
  const location = [patron.address, patron.region].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <section aria-labelledby="welcome-heading" className="rounded-xl bg-primary-900 text-white p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="w-16 h-16 rounded-full border-2 border-white/30 bg-primary-800 flex items-center justify-center shrink-0">
            <Award size={28} aria-hidden="true" className="text-primary-100" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-100">Patrons&apos; Portal</p>
            <h1 id="welcome-heading" className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight mt-0.5">
              Welcome, {patronSalutation(patron)}
            </h1>
            <p className="text-[15px] text-primary-100 mt-1 break-words">
              {[patron.title, patron.fullName].filter(Boolean).join(" ")}
            </p>
            {/* Same colours as the executive and patron badges elsewhere; set
                directly because the banner is dark in both themes. */}
            <p
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: "#f7b267", color: "#1b1440" }}
            >
              <Award size={15} aria-hidden="true" /> Patron of the Association
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <BannerStat label="Occupation" value={patron.occupation} />
          <BannerStat label="Organisation" value={patron.organization || "Not added"} />
          <BannerStat label="Patron Since" value={dateFormat.format(patron.reviewedAt ?? patron.submittedAt)} />
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <DashboardCard
          id="patron-news"
          title="Association News"
          icon={<Megaphone size={20} />}
          readAloud
          footer={
            <Link href="/news" className={footerLinkClasses}>
              All news <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {news.length === 0 ? (
            <p className="text-slate">No news has been published yet.</p>
          ) : (
            <ul className="space-y-3.5">
              {news.map((item) => (
                <li key={item.id}>
                  <Link href={`/news/${item.slug}`} className="font-semibold text-primary-950 hover:text-accent-600">
                    {item.title}
                  </Link>
                  {item.publishedAt && <p className="text-sm text-slate">{dateFormat.format(item.publishedAt)}</p>}
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
          footer={
            <Link href="/patrons/dashboard/events" className={footerLinkClasses}>
              All events <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <UpcomingEventsList events={events} emptyText="No upcoming events have been announced yet." />
        </DashboardCard>

        <DashboardCard
          id="patron-details"
          title="Your Details"
          icon={<UserRound size={20} />}
          footer={
            <Link href="/patrons/dashboard/account" className={footerLinkClasses}>
              Update your details <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <dl className="space-y-2.5">
            <DetailRow label="Email" value={patron.email} />
            <DetailRow label="Telephone" value={patron.phone} />
            <DetailRow label="Position" value={patron.jobTitle || "Not added"} />
            <DetailRow label="Location" value={location || "Not added"} />
          </dl>
        </DashboardCard>

        <DashboardCard id="patron-support" title="Support the Association" icon={<HandHeart size={20} />}>
          <p className="text-slate leading-relaxed">
            Thank you for standing with students with special needs. Here&apos;s where to find the association&apos;s
            work and how to reach the team.
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              ["/about", "About the association and its leadership"],
              ["/donate", "Make a donation"],
              ["/contact", "Contact the association"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={footerLinkClasses}>
                  {label} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
