import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MessageSquare, UserRound, UsersRound } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { listAvailableMentors, listMentorshipsForStudent } from "@/lib/services/mentorship-service";
import { listOpenOpportunities } from "@/lib/services/opportunity-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { OpportunityList } from "@/components/portal/OpportunityList";
import { EmptyState } from "@/components/ui/Common";
import { MentorRequestForm } from "@/components/student-portal/Forms";
import { formatSessionTime } from "@/components/portal/MentorshipThread";
import { mentorshipStatusLabel } from "@/lib/portal-options";

export const metadata = { title: "Mentorship & Alumni" };
export const dynamic = "force-dynamic";

/**
 * Where a student finds a mentor among the association's graduates, and
 * where the openings those graduates post show up. Both on one page because
 * they are the same thing from a student's side: the people who came
 * through this association before them, and what they can offer.
 */
export default async function StudentMentorshipPage() {
  const member = await requireMember();
  const [mentorships, mentors, opportunities] = await Promise.all([
    listMentorshipsForStudent(member.id),
    listAvailableMentors(member.id),
    listOpenOpportunities({ take: 10 }),
  ]);

  const active = mentorships.filter((m) => m.status === "ACTIVE" || m.status === "REQUESTED");
  const past = mentorships.filter((m) => m.status === "DECLINED" || m.status === "ENDED");
  const canAskAnother = !mentorships.some((m) => m.status === "ACTIVE");

  return (
    <>
      <PortalPageHeader
        title="Mentorship & Alumni"
        description="Graduates of this association who have offered to guide students. You talk to your mentor here in the portal — neither of you has to share an email address or a phone number."
      />

      <div className="space-y-6">
        {active.length > 0 && (
          <DashboardCard id="my-mentors" title="Your Mentors" icon={<UserRound size={20} />} readAloud>
            <ul className="divide-y divide-line">
              {active.map((mentorship) => {
                const next = mentorship.sessions[0];
                return (
                  <li key={mentorship.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary-950 break-words">{mentorship.alumni.fullName}</p>
                        <p className="text-sm text-slate">
                          {mentorship.alumni.profession ?? mentorship.alumni.programme} · Class of{" "}
                          {mentorship.alumni.graduationYear}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary-800 shrink-0">
                        {mentorshipStatusLabel(mentorship.status)}
                        {mentorship.unreadByStudent && mentorship.status === "ACTIVE" && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-primary-950">
                            New
                          </span>
                        )}
                      </span>
                    </div>

                    {next && (
                      <p className="text-sm text-slate mt-1">Next session: {formatSessionTime(next.scheduledFor)}</p>
                    )}

                    {mentorship.status === "ACTIVE" ? (
                      <Link
                        href={`/membership/dashboard/mentorship/${mentorship.id}`}
                        className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
                      >
                        <MessageSquare size={15} aria-hidden="true" /> Open the conversation
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="mt-1.5 text-sm text-slate">
                        Waiting for {mentorship.alumni.fullName.split(" ")[0]} to answer. They&apos;ve been emailed.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </DashboardCard>
        )}

        <DashboardCard id="find-mentor" title="Find a Mentor" icon={<UsersRound size={20} />} readAloud>
          {mentors.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={28} aria-hidden="true" />}
              title="No graduates are offering to mentor right now"
              description="Check back — alumni turn this on and off as their time allows."
            />
          ) : (
            <ul className="space-y-4">
              {mentors.map((mentor) => {
                const role = [mentor.currentPosition, mentor.currentOrganization].filter(Boolean).join(" at ");
                const askable = canAskAnother && mentor.hasRoom && mentor.myStatus !== "REQUESTED" && mentor.myStatus !== "ACTIVE";
                return (
                  <li key={mentor.id} className="rounded-lg border border-line p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-11 h-11 rounded-full overflow-hidden bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
                        {mentor.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mentor.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserRound size={20} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-primary-950 break-words">{mentor.fullName}</p>
                        <p className="text-sm text-slate">
                          {role || mentor.profession || mentor.programme} · Class of {mentor.graduationYear}
                        </p>
                        {mentor.bio && <p className="text-[15px] text-ink mt-1.5 leading-relaxed">{mentor.bio}</p>}
                        {mentor.availability && (
                          <p className="text-sm text-slate mt-1.5">Usually free: {mentor.availability}</p>
                        )}
                        <p className="text-xs text-slate mt-1.5">
                          {mentor.hasRoom
                            ? `Guiding ${mentor.activeMentees} of ${mentor.capacity} students`
                            : "Not taking more students at the moment"}
                        </p>

                        {mentor.myStatus === "ACTIVE" && (
                          <p className="mt-2 text-sm font-semibold text-success">This is your mentor.</p>
                        )}
                        {mentor.myStatus === "REQUESTED" && (
                          <p className="mt-2 text-sm font-semibold text-primary-800">You&apos;ve asked them already.</p>
                        )}
                        {mentor.myStatus === "DECLINED" && (
                          <p className="mt-2 text-sm text-slate">
                            They couldn&apos;t take this on last time you asked.
                          </p>
                        )}

                        {askable && (
                          <details className="mt-3 group">
                            <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3.5 py-2 min-h-11 text-sm font-semibold text-primary-950 hover:bg-surface-muted list-none">
                              Ask {mentor.fullName.split(" ")[0]} to mentor me
                            </summary>
                            <div className="mt-3">
                              <MentorRequestForm alumniId={mentor.id} mentorName={mentor.fullName} />
                            </div>
                          </details>
                        )}
                        {!canAskAnother && mentor.myStatus === null && (
                          <p className="mt-2 text-xs text-slate">
                            You already have a mentor. End that mentorship first if you&apos;d like a different one.
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          id="opportunities"
          title="Opportunities from Alumni"
          icon={<BriefcaseBusiness size={20} />}
          readAloud
        >
          <p className="text-sm text-slate mb-3">
            Jobs, internships and scholarships posted by graduates of this association. Each one is checked by the
            association before it appears here.
          </p>
          {opportunities.length === 0 ? (
            <p className="text-slate">Nothing on the board right now.</p>
          ) : (
            <OpportunityList items={opportunities} />
          )}
        </DashboardCard>

        {past.length > 0 && (
          <DashboardCard id="past-mentorships" title="Earlier Requests" icon={<UserRound size={20} />}>
            <ul className="divide-y divide-line">
              {past.map((mentorship) => (
                <li key={mentorship.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold text-primary-950">{mentorship.alumni.fullName}</p>
                  <p className="text-sm text-slate">{mentorshipStatusLabel(mentorship.status)}</p>
                  {mentorship.declineReason && (
                    <p className="text-sm text-ink mt-1 italic">&ldquo;{mentorship.declineReason}&rdquo;</p>
                  )}
                </li>
              ))}
            </ul>
          </DashboardCard>
        )}
      </div>
    </>
  );
}
