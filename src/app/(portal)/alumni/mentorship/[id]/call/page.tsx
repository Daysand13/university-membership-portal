import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { getMentorshipForMentor } from "@/lib/services/mentorship-service";
import { liveMentorshipCall } from "@/lib/services/mentorship-call-service";
import { whoIsIn } from "@/lib/mentorship-call";
import { meetingFor } from "@/lib/server/meeting";
import { formatSessionTime } from "@/lib/portal-options";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CallRoom } from "@/components/portal/CallRoom";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Call your student" };
export const dynamic = "force-dynamic";

/**
 * A mentor's call with their student. The student's page is the same thing
 * from the other side; the mentor is the one who runs the room — the
 * waiting room, and who may stay in it.
 */
export default async function MentorCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const alumnus = await requireAlumni();
  const { id } = await params;
  const { session: sessionId } = await searchParams;
  const mentorship = await getMentorshipForMentor({ alumniId: alumnus.id, id });
  if (!mentorship) notFound();

  const student = formatFullName(mentorship.member.firstName, mentorship.member.middleName, mentorship.member.lastName);
  const back = `/alumni/mentorship/${id}`;
  const session = sessionId ? mentorship.sessions.find((s) => s.id === sessionId) : undefined;
  const backLink = (
    <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
      <ArrowLeft size={15} aria-hidden="true" /> Back to the conversation
    </Link>
  );

  if (mentorship.status !== "ACTIVE") {
    return (
      <div className="max-w-4xl space-y-6">
        {backLink}
        <PortalPageHeader title={`Call with ${student}`} />
        <p role="status" className="rounded-lg border border-warning bg-warning-light px-4 py-3 text-ink">
          This mentorship has ended, so its calls have ended too.
        </p>
      </div>
    );
  }

  const [meeting, live] = await Promise.all([
    meetingFor({ mentorshipId: id, user: { id: `alumni-${alumnus.id}`, name: alumnus.fullName }, moderator: true }),
    liveMentorshipCall(id),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      {backLink}
      <PortalPageHeader
        title={`Call with ${student}`}
        description={session ? `${formatSessionTime(session.scheduledFor)}${session.topic ? ` · ${session.topic}` : ""}` : undefined}
      />
      <CallRoom
        meeting={meeting}
        side="mentor"
        mentorshipId={id}
        sessionId={session?.id ?? null}
        displayName={alumnus.fullName}
        otherName={student}
        leaveHref={back}
        otherIsWaiting={live ? whoIsIn(live).student : false}
      />
    </div>
  );
}
