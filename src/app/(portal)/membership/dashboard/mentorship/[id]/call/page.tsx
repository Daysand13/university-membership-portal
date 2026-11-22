import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getMentorshipForStudent } from "@/lib/services/mentorship-service";
import { liveMentorshipCall } from "@/lib/services/mentorship-call-service";
import { whoIsIn } from "@/lib/mentorship-call";
import { meetingFor } from "@/lib/server/meeting";
import { formatSessionTime } from "@/lib/portal-options";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CallRoom } from "@/components/portal/CallRoom";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Call your mentor" };
export const dynamic = "force-dynamic";

/**
 * A student's call with their mentor — at any time while the mentorship is
 * active, for as long as they like. A booked session, if they came from
 * one, is only shown for context.
 *
 * The room's name is never in the address bar: it is worked out on the
 * server, and only after checking that this mentorship is this student's.
 */
export default async function StudentCallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const member = await requireMember();
  const { id } = await params;
  const { session: sessionId } = await searchParams;
  const mentorship = await getMentorshipForStudent({ memberId: member.id, id });
  if (!mentorship) notFound();

  const back = `/membership/dashboard/mentorship/${id}`;
  const session = sessionId ? mentorship.sessions.find((s) => s.id === sessionId) : undefined;
  const name = formatFullName(member.firstName, member.middleName, member.lastName);
  const backLink = (
    <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
      <ArrowLeft size={15} aria-hidden="true" /> Back to the conversation
    </Link>
  );

  if (mentorship.status !== "ACTIVE") {
    return (
      <div className="max-w-4xl space-y-6">
        {backLink}
        <PortalPageHeader title={`Call with ${mentorship.alumni.fullName}`} />
        <p role="status" className="rounded-lg border border-warning bg-warning-light px-4 py-3 text-ink">
          This mentorship has ended, so its calls have ended too.
        </p>
      </div>
    );
  }

  const [meeting, live] = await Promise.all([
    meetingFor({ mentorshipId: id, user: { id: `member-${member.id}`, name }, moderator: false }),
    liveMentorshipCall(id),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      {backLink}
      <PortalPageHeader
        title={`Call with ${mentorship.alumni.fullName}`}
        description={session ? `${formatSessionTime(session.scheduledFor)}${session.topic ? ` · ${session.topic}` : ""}` : undefined}
      />
      <CallRoom
        meeting={meeting}
        side="student"
        mentorshipId={id}
        sessionId={session?.id ?? null}
        displayName={name}
        otherName={mentorship.alumni.fullName}
        leaveHref={back}
        otherIsWaiting={live ? whoIsIn(live).mentor : false}
      />
    </div>
  );
}
