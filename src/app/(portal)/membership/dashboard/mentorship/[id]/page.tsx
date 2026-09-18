import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MessageSquare, Target } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getMentorshipForStudent, markMentorshipRead } from "@/lib/services/mentorship-service";
import {
  bookSessionAsStudentAction,
  cancelSessionAsStudentAction,
  endMentorshipAsStudentAction,
  sendStudentMessageAction,
} from "@/lib/actions/student-portal-actions";
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

export const metadata = { title: "Your Mentor" };
export const dynamic = "force-dynamic";

export default async function StudentMentorshipThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  const mentorship = await getMentorshipForStudent({ memberId: member.id, id });
  if (!mentorship) notFound();

  // Opening the conversation is what marks it read — the same rule as the
  // patrons' executive channel.
  if (mentorship.unreadByStudent) {
    await markMentorshipRead({ id, side: "student", actorId: member.id });
  }

  const mentor = mentorship.alumni;
  const role = [mentor.currentPosition, mentor.currentOrganization].filter(Boolean).join(" at ");
  const upcoming = mentorship.sessions.filter((s) => s.status === "SCHEDULED");
  const finished = mentorship.sessions.filter((s) => s.status !== "SCHEDULED");
  const active = mentorship.status === "ACTIVE";

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/membership/dashboard/mentorship"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Mentorship & Alumni
      </Link>

      <PortalPageHeader
        title={mentor.fullName}
        description={
          <>
            {role || mentor.profession || mentor.programme} · Class of {mentor.graduationYear}
            {mentor.mentorAvailability && <> · usually free {mentor.mentorAvailability}</>}
          </>
        }
      />

      {mentorship.goals && (
        <DashboardCard id="goals" title="What You're Working On" icon={<Target size={20} />} readAloud>
          <p className="whitespace-pre-line leading-relaxed text-ink">{mentorship.goals}</p>
        </DashboardCard>
      )}

      <DashboardCard id="conversation" title="Conversation" icon={<MessageSquare size={20} />}>
        <MentorshipThread messages={mentorship.messages} viewer="student" otherName={mentor.fullName} />
        <div className="mt-5 pt-5 border-t border-line">
          <MessageComposer
            action={sendStudentMessageAction.bind(null, mentorship.id)}
            disabled={!active}
            disabledReason="This mentorship has ended, so the conversation is closed."
          />
        </div>
      </DashboardCard>

      <DashboardCard id="sessions" title="Sessions" icon={<CalendarClock size={20} />} readAloud>
        {upcoming.length === 0 && finished.length === 0 && (
          <p className="text-slate mb-4">No sessions yet. Book one at a time that suits you both.</p>
        )}

        {upcoming.length > 0 && (
          <ul className="divide-y divide-line mb-4">
            {upcoming.map((session) => (
              <li key={session.id} className="py-3 first:pt-0 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary-950">{formatSessionTime(session.scheduledFor)}</p>
                  {session.topic && <p className="text-sm text-slate">{session.topic}</p>}
                  <p className="text-xs text-slate">
                    Booked by {session.bookedByStudent ? "you" : mentor.fullName.split(" ")[0]}
                  </p>
                </div>
                <PortalActionButton
                  action={cancelSessionAsStudentAction.bind(null, session.id)}
                  variant="danger"
                  confirm="Cancel this session?"
                  pendingLabel="Cancelling…"
                >
                  Cancel
                </PortalActionButton>
              </li>
            ))}
          </ul>
        )}

        {active && (
          <div className="pt-4 border-t border-line">
            <SessionBookingForm action={bookSessionAsStudentAction.bind(null, mentorship.id)} />
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
            action={endMentorshipAsStudentAction.bind(null, mentorship.id)}
            variant="danger"
            confirm="End this mentorship? You'll be able to ask a different graduate afterwards."
            pendingLabel="Ending…"
          >
            End this mentorship
          </PortalActionButton>
          <p className="mt-2 text-xs text-slate max-w-md">
            Ending it closes the conversation. Nothing is sent to {mentor.fullName.split(" ")[0]} beyond the fact that
            it ended.
          </p>
        </div>
      )}
    </div>
  );
}
