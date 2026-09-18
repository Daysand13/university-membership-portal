import Link from "next/link";
import { ArrowRight, CalendarClock, MessageSquare, Settings2, UserRound, UsersRound } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { getMentorMetrics, listMentorshipsForMentor, studentName } from "@/lib/services/mentorship-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { EmptyState } from "@/components/ui/Common";
import { MentorSettingsForm, MentorshipResponseForm } from "@/components/alumni-portal/Forms";
import { formatSessionTime } from "@/components/portal/MentorshipThread";
import { mentorshipStatusLabel } from "@/lib/portal-options";

export const metadata = { title: "Mentorship Centre" };
export const dynamic = "force-dynamic";

/**
 * The graduate's side of mentorship: students waiting for an answer, the
 * ones they're already guiding, and the switch that decides whether they
 * appear on the students' list at all.
 */
export default async function AlumniMentorshipPage() {
  const alumni = await requireAlumni();
  const [mentorships, metrics] = await Promise.all([
    listMentorshipsForMentor(alumni.id),
    getMentorMetrics(alumni.id),
  ]);

  const requests = mentorships.filter((m) => m.status === "REQUESTED");
  const active = mentorships.filter((m) => m.status === "ACTIVE");
  const past = mentorships.filter((m) => m.status === "ENDED" || m.status === "DECLINED");

  return (
    <>
      <PortalPageHeader
        title="Mentorship Centre"
        description="Students who've asked you for guidance, and the ones you're already working with. Everything happens in the portal — neither of you has to hand over an email address or a phone number."
      />

      <section aria-label="Your mentoring" className="grid gap-3 sm:grid-cols-3 mb-6">
        {[
          { label: "Students you're guiding", value: String(metrics.activeMentees) },
          { label: "Sessions completed", value: String(metrics.sessionsCompleted) },
          {
            label: "Next session",
            value: metrics.nextSession ? formatSessionTime(metrics.nextSession.scheduledFor) : "None booked",
          },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-line bg-white p-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">{tile.label}</p>
            <p className="mt-1 font-display font-bold text-lg text-primary-950 break-words">{tile.value}</p>
          </div>
        ))}
      </section>

      <div className="space-y-6">
        {requests.length > 0 && (
          <DashboardCard
            id="requests"
            title={`${requests.length} Student${requests.length === 1 ? "" : "s"} Waiting for Your Answer`}
            icon={<UserRound size={20} />}
            readAloud
          >
            <ul className="space-y-6">
              {requests.map((mentorship) => {
                const name = studentName(mentorship.member);
                return (
                  <li key={mentorship.id} className="rounded-lg border border-line p-4">
                    <p className="font-semibold text-primary-950 break-words">{name}</p>
                    <p className="text-sm text-slate">
                      {mentorship.member.programme} · Level {mentorship.member.level}
                    </p>
                    {mentorship.requestNote && (
                      <p className="mt-2 rounded-lg bg-surface-muted px-3.5 py-3 text-[15px] text-ink whitespace-pre-line">
                        {mentorship.requestNote}
                      </p>
                    )}
                    <div className="mt-4">
                      <MentorshipResponseForm mentorshipId={mentorship.id} studentName={name} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </DashboardCard>
        )}

        <DashboardCard id="mentees" title="Your Mentees" icon={<UsersRound size={20} />} readAloud>
          {active.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={28} aria-hidden="true" />}
              title="You're not mentoring anyone yet"
              description="Turn on your availability below and students will be able to ask you."
            />
          ) : (
            <ul className="divide-y divide-line">
              {active.map((mentorship) => {
                const name = studentName(mentorship.member);
                const next = mentorship.sessions[0];
                return (
                  <li key={mentorship.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary-950 break-words">
                          {name}
                          {mentorship.unreadByMentor && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-primary-950">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate">
                          {mentorship.member.programme} · Level {mentorship.member.level}
                        </p>
                      </div>
                      {next && (
                        <p className="text-sm text-slate shrink-0 inline-flex items-center gap-1.5">
                          <CalendarClock size={14} aria-hidden="true" /> {formatSessionTime(next.scheduledFor)}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/alumni/mentorship/${mentorship.id}`}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
                    >
                      <MessageSquare size={15} aria-hidden="true" /> Open the conversation
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard id="availability" title="Your Mentoring Availability" icon={<Settings2 size={20} />}>
          <MentorSettingsForm
            willingToMentor={alumni.willingToMentor}
            availability={alumni.mentorAvailability}
            capacity={alumni.mentorCapacity}
          />
        </DashboardCard>

        {past.length > 0 && (
          <DashboardCard id="past" title="Earlier Mentorships" icon={<UserRound size={20} />}>
            <ul className="divide-y divide-line">
              {past.map((mentorship) => (
                <li key={mentorship.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold text-primary-950">{studentName(mentorship.member)}</p>
                  <p className="text-sm text-slate">{mentorshipStatusLabel(mentorship.status)}</p>
                </li>
              ))}
            </ul>
          </DashboardCard>
        )}
      </div>
    </>
  );
}
