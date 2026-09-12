import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  IdCard,
  LifeBuoy,
  Megaphone,
  User,
  UserCog,
  Vote,
  Wallet,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DuesCard } from "@/components/dashboard/DuesCard";
import { DashboardCard } from "./DashboardCard";
import { PortalNotice } from "./PortalNotice";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export interface MemberDashboardViewProps {
  member: {
    firstName: string;
    fullName: string;
    indexNumber: string;
    departmentLabel: string;
    department: string;
    level: string;
    status: string;
    memberSince: Date;
    profileImageUrl: string | null;
    mustChangePassword: boolean;
  };
  notices: { dues?: "success" | "failed" | "error"; passwordChanged?: boolean };
  dues: { academicYear: string; amountLabel: string; tierLabel: string; paidAt: Date | null };
  news: { id: string; title: string; slug: string; excerpt: string; publishedAt: Date | null }[];
  /** Null if the QR code couldn't be produced — the rest of the card still shows. */
  card: { qrSvg: string } | null;
}

function BannerStat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-3 min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-primary-100">{label}</dt>
      <dd className={`mt-1 text-base font-semibold text-white break-words ${mono ? "font-data" : ""}`}>{value}</dd>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-3 min-h-14 hover:border-primary-600 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <span aria-hidden="true" className="w-9 h-9 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-primary-950">{title}</span>
          <span className="block text-sm text-slate">{description}</span>
        </span>
        <ArrowRight size={16} aria-hidden="true" className="text-slate shrink-0" />
      </Link>
    </li>
  );
}

const footerLinkClasses = "inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600";

export function MemberDashboardView({ member, notices, dues, news, card }: MemberDashboardViewProps) {
  return (
    <div className="space-y-6">
      {notices.passwordChanged && <PortalNotice tone="success">Your password has been changed.</PortalNotice>}
      {notices.dues === "success" && (
        <PortalNotice tone="success">
          Payment received — thank you! Your {dues.academicYear} dues are now marked as paid.
        </PortalNotice>
      )}
      {notices.dues === "failed" && (
        <PortalNotice tone="danger">
          That payment didn&apos;t go through. No dues have been charged — you can try again below.
        </PortalNotice>
      )}
      {notices.dues === "error" && (
        <PortalNotice tone="warning">
          We couldn&apos;t confirm that payment right away. If you completed checkout, it will update shortly —
          otherwise, try again below.
        </PortalNotice>
      )}
      {member.mustChangePassword && (
        <PortalNotice
          tone="warning"
          action={
            <Link href="/membership/dashboard/change-password" className="font-semibold underline">
              Change password
            </Link>
          }
        >
          You&apos;re still using the temporary password from your approval email. Please change it to keep your
          account secure.
        </PortalNotice>
      )}

      <section aria-labelledby="welcome-heading" className="rounded-xl bg-primary-900 text-white p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 bg-primary-800 flex items-center justify-center shrink-0">
            {member.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={28} aria-hidden="true" className="text-primary-100" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-100">Student Portal</p>
            <h1 id="welcome-heading" className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight mt-0.5">
              Welcome back, {member.firstName}
            </h1>
            <p className="text-[15px] text-primary-100 mt-1 break-words">{member.fullName}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <BannerStat label="Index Number" value={member.indexNumber} mono />
          <BannerStat label={member.departmentLabel} value={member.department} />
          <BannerStat label="Level" value={member.level} />
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <DashboardCard id="membership-card" title="Membership Status & ID Card" icon={<IdCard size={20} />} readAloud>
          <div className="flex flex-col sm:flex-row gap-5">
            <dl className="flex-1 space-y-3 min-w-0">
              <div>
                <dt className="text-sm text-slate">Membership Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={member.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate">Index Number</dt>
                <dd className="font-data font-semibold text-primary-950 break-all">{member.indexNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate">Member Since</dt>
                <dd className="font-semibold text-primary-950">{dateFormat.format(member.memberSince)}</dd>
              </div>
            </dl>
            {card && (
              <figure className="shrink-0 self-center sm:self-start text-center">
                <div
                  role="img"
                  aria-label="QR code that verifies your membership"
                  className="w-36 h-36 rounded-lg border border-line bg-[#ffffff] p-1 [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: card.qrSvg }}
                />
                <figcaption className="mt-2 text-xs text-slate max-w-[9rem] mx-auto">
                  Show this code at association events to confirm your membership.
                </figcaption>
              </figure>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          id="dues"
          title="Financials & Dues"
          icon={<Wallet size={20} />}
          readAloud
          footer={
            <Link href="/membership/dashboard/dues" className={footerLinkClasses}>
              View payment history <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <DuesCard
            bare
            academicYear={dues.academicYear}
            amountLabel={dues.amountLabel}
            tierLabel={dues.tierLabel}
            paidAt={dues.paidAt}
          />
        </DashboardCard>

        <DashboardCard
          id="association-updates"
          title="Association Updates"
          icon={<Megaphone size={20} />}
          readAloud
          footer={
            <Link href="/news" className={footerLinkClasses}>
              All announcements <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {news.length === 0 ? (
            <p className="text-slate">No announcements have been published yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {news.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/news/${item.slug}`}
                    className="font-semibold text-primary-800 hover:text-accent-600 hover:underline break-words"
                  >
                    {item.title}
                  </Link>
                  {item.publishedAt && (
                    <p className="text-xs text-slate mt-0.5">
                      <time dateTime={item.publishedAt.toISOString()}>{dateFormat.format(item.publishedAt)}</time>
                    </p>
                  )}
                  <p className="text-sm text-slate mt-1 line-clamp-2">{item.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard id="quick-actions" title="Quick Actions" icon={<Zap size={20} />}>
          <ul className="space-y-2.5">
            <QuickAction
              href="/membership/dashboard/elections"
              icon={<Vote size={18} />}
              title="Vote in Elections"
              description="Candidates, key dates and how voting works"
            />
            <QuickAction
              href="/membership/dashboard/profile"
              icon={<UserCog size={18} />}
              title="Update Profile Details"
              description="Phone, address and emergency contact"
            />
            <QuickAction
              href="/contact?subject=Accessibility%20support%20request"
              icon={<LifeBuoy size={18} />}
              title="Request Support / Accessibility Assistance"
              description="Tell the association what help you need"
            />
            <QuickAction
              href="/membership/dashboard/events"
              icon={<CalendarDays size={18} />}
              title="Upcoming Events"
              description="What's on across the association"
            />
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
