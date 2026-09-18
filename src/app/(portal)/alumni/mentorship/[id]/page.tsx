import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MessageSquare, Target } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { getMentorshipForMentor, markMentorshipRead, studentName } from "@/lib/services/mentorship-service";
import {
  bookSessionAsMentorAction,
  closeSessionAsMentorAction,
  endMentorshipAsMentorAction,
  sendMentorMessageAction,
} from "@/lib/actions/alumni-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import {
  MentorshipThread,
  MessageComposer,
  SessionBookingForm,
  formatSessionTime,
} from "@/components/portal/MentorshipThread";
import { PortalActionButton } from "@/components/student-portal/Forms";
import { SESSION_STATUS_LABELS } from "@/lib/portal-options";

export const metadata = { title: "Mentee" };
export const dynamic = "force-dynamic";

export default async function AlumniMentorshipThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const alumni = await requireAlumni();
  const { id } = await params;
  const mentorship = await getMentorshipForMentor({ alumniId: alumni.id, id });
  if (!mentorship) notFound();

  if (mentorship.unreadByMentor) {
    await markMentorshipRead({ id, side: "mentor", actorId: alumni.id });
  }

  const name = studentName(mentorship.member);
  const upcoming = mentorship.sessions.filter((s) => s.status === "SCHEDULED");
  const finished = mentorship.sessions.filter((s) => s.status !== "SCHEDULED");
  const active = mentorship.status === "ACTIVE";

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/alumni/mentorship"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Mentorship Centre
      </Link>

      <PortalPageHeader
        title={name}
        description={
          <>
            {mentorship.member.programme} · Level {mentorship.member.level}
            {mentorship.member.academicDepartment && <> · {mentorship.member.academicDepartment}</>}
          </>
        }
      />

      {mentorship.goals && (
        <DashboardCard id="goals" title="What You're Working On" icon={<Target size={20} />} readAloud>
          <p className="whitespace-pre-line leading-relaxed text-ink">{mentorship.goals}</p>
        </DashboardCard>
      )}

      <DashboardCard id="conversation" title="Conversation" icon={<MessageSquare size={20} />}>
        <MentorshipThread messages={mentorship.messages} viewer="mentor" otherName={name} />
        <div className="mt-5 pt-5 border-t border-line">
          <MessageComposer
            action={sendMentorMessageAction.bind(null, mentorship.id)}
            disabled={!active}
            disabledReason="This mentorship has ended, so the conversation is closed."
          />
        </div>
      </DashboardCard>

      <DashboardCard id="sessions" title="Sessions" icon={<CalendarClock size={20} />} readAloud>
        {upcoming.length === 0 && finished.length === 0 && (
          <p className="text-slate mb-4">No sessions yet. Offer a time that suits you both.</p>
        )}

        {upcoming.length > 0 && (
          <ul className="divide-y divide-line mb-4">
            {upcoming.map((session) => (
              <li key={session.id} className="py-3 first:pt-0 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary-950">{formatSessionTime(session.scheduledFor)}</p>
                  {session.topic && <p className="text-sm text-slate">{session.topic}</p>}
                  <p className="text-xs text-slate">Booked by {session.bookedByStudent ? name.split(" ")[0] : "you"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PortalActionButton
                    action={closeSessionAsMentorAction.bind(null, session.id, true)}
                    variant="primary"
                    pendingLabel="Saving…"
                  >
                    Mark as done
                  </PortalActionButton>
                  <PortalActionButton
                    action={closeSessionAsMentorAction.bind(null, session.id, false)}
                    variant="danger"
                    confirm="Cancel this session?"
                    pendingLabel="Cancelling…"
                  >
                    Cancel
                  </PortalActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        {active && (
          <div className="pt-4 border-t border-line">
            <SessionBookingForm action={bookSessionAsMentorAction.bind(null, mentorship.id)} label="Offer a time" />
          </div>
        )}

        {finished.length > 0 && (
          <div className="mt-5 pt-4 border-t border-line">
            <h3 className="text-sm font-semibold text-primary-950 mb-2">Earlier sessions</h3>
            <ul className="space-y-1.5">
              {finished.map((session) => (
                <li key={session.id} className="text-sm text-slate">
                  {formatSessionTime(session.scheduledFor)} · {SESSION_STATUS_LABELS[session.status]}
                  {session.topic && <> · {session.topic}</>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DashboardCard>

      {active && (
        <div>
          <PortalActionButton
            action={endMentorshipAsMentorAction.bind(null, mentorship.id)}
            variant="danger"
            confirm="End this mentorship? The student will be able to ask another graduate."
            pendingLabel="Ending…"
          >
            End this mentorship
          </PortalActionButton>
          <p className="mt-2 text-xs text-slate max-w-md">
            Ending it closes the conversation and frees a place for another student.
          </p>
        </div>
      )}
    </div>
  );
}
