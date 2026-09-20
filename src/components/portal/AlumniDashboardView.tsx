import { WelcomeGreeting } from "@/components/ui/WelcomeGreeting";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Network, User, UserRound } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { DashboardCard } from "./DashboardCard";
import { PortalNotice } from "./PortalNotice";
import { TeamRoleBadges } from "./TeamRoleBadges";
import type { TeamRoleBadge } from "@/lib/services/team-role-service";
import { UpcomingEventsList, type UpcomingEvent } from "./UpcomingEventsList";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export interface AlumniDashboardViewProps {
  alumni: {
    firstName: string;
    fullName: string;
    email: string;
    graduationYear: number;
    programme: string;
    profession: string | null;
    currentLocation: string | null;
    currentPosition: string | null;
    currentOrganization: string | null;
    industry: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    willingToMentor: boolean;
    directoryVisible: boolean;
    profileImageUrl: string | null;
  };
  notices: { passwordChanged?: boolean };
  network: { directoryCount: number; mentorCount: number; events: UpcomingEvent[] };
  studyRecordCount: number;
  furtherStudies: { status: string; submittedAt: Date; programme: string } | null;
  /** Holds active student standing right now (dual status). */
  isCurrentlyEnrolled: boolean;
  /** Executive or patron positions this person holds, shown as badges. */
  teamRoles: TeamRoleBadge[];
  /** What this graduate has put in: mentoring, giving, and what it's called. */
  standing: {
    activeMentees: number;
    pendingRequests: number;
    lifetimeGivingLabel: string;
    rank: { label: string; detail: string };
  };
  /**
   * The "undergraduate programmes" card — only for a graduate doing (or who
   * has done) postgraduate study, whose earlier degree may not be on record.
   */
  priorProgrammes?: ReactNode;
  /** The patrons' announcements card, when there are any. */
  announcements?: ReactNode;
}

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
      <dt className="text-sm text-slate sm:w-36 shrink-0">{label}</dt>
      <dd className="font-semibold text-primary-950 break-words min-w-0">{value}</dd>
    </div>
  );
}

const footerLinkClasses = "inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600";

/** One of the three "what you've put in" tiles. */
function StandingTile({
  href,
  label,
  value,
  detail,
  attention = false,
}: {
  href: string;
  label: string;
  value: string;
  detail: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 min-w-0 hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
        attention ? "border-accent-400 bg-accent-50" : "border-line bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 font-display font-bold text-lg text-primary-950 break-words">{value}</p>
      <p className="text-xs text-slate mt-0.5">{detail}</p>
    </Link>
  );
}

export function AlumniDashboardView({
  alumni,
  notices,
  network,
  studyRecordCount,
  furtherStudies,
  isCurrentlyEnrolled,
  teamRoles,
  standing,
  priorProgrammes,
  announcements,
}: AlumniDashboardViewProps) {
  const pendingFurtherStudies =
    furtherStudies && (furtherStudies.status === "PENDING" || furtherStudies.status === "UNDER_REVIEW");
  const currentRole = [alumni.currentPosition, alumni.currentOrganization].filter(Boolean).join(" at ");

  return (
    <div className="space-y-6">
      <WelcomeGreeting firstName={alumni.firstName} />
      {notices.passwordChanged && <PortalNotice tone="success">Your password has been changed.</PortalNotice>}

      <section aria-labelledby="welcome-heading" className="rounded-xl bg-primary-900 text-white p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 bg-primary-800 flex items-center justify-center shrink-0">
            {alumni.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={alumni.profileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={28} aria-hidden="true" className="text-primary-100" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-100">Alumni Portal</p>
            <h1 id="welcome-heading" className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight mt-0.5">
              Welcome back, {alumni.firstName}
            </h1>
            <p className="text-[15px] text-primary-100 mt-1 break-words">{alumni.fullName}</p>
            <TeamRoleBadges roles={teamRoles} />
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <BannerStat label="Graduation Year" value={`Class of ${alumni.graduationYear}`} />
          <BannerStat label="Programme Completed" value={alumni.programme} />
          <BannerStat label="Registered Email" value={alumni.email} />
        </dl>
      </section>

      <section aria-label="What you've put in" className="grid gap-3 sm:grid-cols-3">
        <StandingTile
          href="/alumni/mentorship"
          label="Students you're guiding"
          value={String(standing.activeMentees)}
          detail={
            standing.pendingRequests > 0
              ? `${standing.pendingRequests} waiting for your answer`
              : alumni.willingToMentor
                ? "You're listed as available"
                : "Turn on availability to be asked"
          }
          attention={standing.pendingRequests > 0}
        />
        <StandingTile
          href="/alumni/giving"
          label="Lifetime giving"
          value={standing.lifetimeGivingLabel}
          detail="Every cedi goes to students here"
        />
        <StandingTile
          href="/alumni/advocacy"
          label="Network standing"
          value={standing.rank.label}
          detail={standing.rank.detail}
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <DashboardCard
          id="alumni-profile"
          title="Alumni Profile Summary"
          icon={<UserRound size={20} />}
          readAloud
          footer={
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/alumni/records" className={footerLinkClasses}>
                Academic records <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/alumni/profile" className={footerLinkClasses}>
                Edit profile <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          }
        >
          <dl className="space-y-2.5">
            <DetailRow label="Graduated" value={`Class of ${alumni.graduationYear}`} />
            <DetailRow label="Programme" value={alumni.programme} />
            <DetailRow label="Profession" value={alumni.profession || "Not added yet"} />
            <DetailRow label="Location" value={alumni.currentLocation || "Not added yet"} />
            <DetailRow label="Mentoring" value={alumni.willingToMentor ? "Available as a mentor" : "Not currently mentoring"} />
            <DetailRow label="Directory" value={alumni.directoryVisible ? "Visible to fellow alumni" : "Hidden"} />
            <DetailRow
              label="Study records"
              value={studyRecordCount === 1 ? "1 period of study on file" : `${studyRecordCount} periods of study on file`}
            />
          </dl>
        </DashboardCard>

        {priorProgrammes && (
          <DashboardCard
            id="undergraduate-programmes"
            title="Your Undergraduate Programmes"
            icon={<GraduationCap size={20} />}
            footer={
              <Link href="/alumni/records" className={footerLinkClasses}>
                Full academic record <ArrowRight size={14} aria-hidden="true" />
              </Link>
            }
          >
            <p className="text-sm text-slate mb-4">
              Our records of your studies start at your postgraduate programme. Add the undergraduate programme you
              did first — here or at another university — so your history is complete.
            </p>
            {priorProgrammes}
          </DashboardCard>
        )}

        <DashboardCard
          id="further-studies"
          title="Further Studies Pathway"
          icon={<GraduationCap size={20} />}
          readAloud
          className="border-accent-400"
        >
          {pendingFurtherStudies ? (
            <div>
              <p className="font-semibold text-primary-950">Your further-studies application is being reviewed.</p>
              <p className="text-slate mt-1">
                You applied for {furtherStudies.programme} on {dateFormat.format(furtherStudies.submittedAt)}. We&apos;ll
                email you as soon as there&apos;s a decision.
              </p>
            </div>
          ) : isCurrentlyEnrolled ? (
            <div>
              <p className="font-semibold text-primary-950">You&apos;re currently enrolled as a student as well.</p>
              <p className="text-slate mt-1">
                Use &ldquo;Viewing as&rdquo; at the top of the page to move to your Student Portal.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display font-bold text-lg text-primary-950 leading-snug">
                Returning to the University for Postgraduate or Further Studies?
              </p>
              <p className="text-slate mt-1.5">
                Apply for student membership again with your new index number. Your alumni account stays exactly as it
                is.
              </p>
              {furtherStudies?.status === "REJECTED" && (
                <p className="text-slate mt-2 text-sm">
                  Your previous application wasn&apos;t approved — you&apos;re welcome to apply again.
                </p>
              )}
              <LinkButton href="/alumni/further-studies" variant="secondary" size="lg" className="mt-4 w-full sm:w-auto">
                Enroll with a New Index Number
              </LinkButton>
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          id="alumni-network"
          title="Alumni Network & Directory"
          icon={<Network size={20} />}
          readAloud
          footer={
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/alumni/directory" className={footerLinkClasses}>
                Directory <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/alumni/mentorship" className={footerLinkClasses}>
                Mentorship board <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/alumni/events" className={footerLinkClasses}>
                All events <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line p-3">
              <p className="font-display font-bold text-2xl text-primary-950">{network.directoryCount}</p>
              <p className="text-sm text-slate">graduates in the directory</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="font-display font-bold text-2xl text-primary-950">{network.mentorCount}</p>
              <p className="text-sm text-slate">mentors available</p>
            </div>
          </div>
          <h3 className="mt-5 mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Upcoming events & reunions</h3>
          <UpcomingEventsList events={network.events} emptyText="No upcoming events have been announced yet." />
        </DashboardCard>

        <DashboardCard id="professional-updates" title="Professional Updates" icon={<Briefcase size={20} />} readAloud>
          {currentRole || alumni.industry || alumni.linkedinUrl || alumni.websiteUrl ? (
            <dl className="space-y-2.5">
              {currentRole && <DetailRow label="Current role" value={currentRole} />}
              {alumni.industry && <DetailRow label="Industry" value={alumni.industry} />}
              {alumni.linkedinUrl && (
                <div className="flex flex-col sm:flex-row sm:gap-3">
                  <dt className="text-sm text-slate sm:w-36 shrink-0">LinkedIn</dt>
                  <dd className="min-w-0">
                    <a
                      href={alumni.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-800 hover:text-accent-600 underline break-all"
                    >
                      View LinkedIn profile<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
              {alumni.websiteUrl && (
                <div className="flex flex-col sm:flex-row sm:gap-3">
                  <dt className="text-sm text-slate sm:w-36 shrink-0">Website</dt>
                  <dd className="min-w-0">
                    <a
                      href={alumni.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-800 hover:text-accent-600 underline break-all"
                    >
                      {alumni.websiteUrl}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-slate">
              Add your current role, industry and LinkedIn profile so fellow graduates can see what you&apos;re doing now.
            </p>
          )}
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <LinkButton href="/alumni/career" className="w-full sm:w-auto">
              Update career details
            </LinkButton>
            <LinkButton href="/alumni/profile" variant="outline" className="w-full sm:w-auto">
              Update contact details
            </LinkButton>
          </div>
        </DashboardCard>

        {announcements}
      </div>
    </div>
  );
}
