import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getMentorshipForStudent } from "@/lib/services/mentorship-service";
import { getSiteSettings } from "@/lib/services/content-service";
import { callWindow, meetingDomainOf } from "@/lib/mentorship-call";
import { callRoomFor } from "@/lib/server/call-room";
import { formatSessionTime } from "@/lib/portal-options";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CallRoom } from "@/components/portal/CallRoom";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Call your mentor" };
export const dynamic = "force-dynamic";

/**
 * A student joining the call for one of their sessions.
 *
 * The room's name is never in the address bar: it is worked out on the
 * server from the session's id, and only after checking that this session
 * belongs to this student's own mentorship.
 */
export default async function StudentSessionCallPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const member = await requireMember();
  const { id, sessionId } = await params;
  const mentorship = await getMentorshipForStudent({ memberId: member.id, id });
  if (!mentorship) notFound();

  const session = mentorship.sessions.find((s) => s.id === sessionId);
  if (!session) notFound();

  const back = `/membership/dashboard/mentorship/${id}`;
  const window = callWindow(session);
  const settings = await getSiteSettings();

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
        <ArrowLeft size={15} aria-hidden="true" /> Back to the conversation
      </Link>

      <PortalPageHeader
        title={`Call with ${mentorship.alumni.fullName}`}
        description={`${formatSessionTime(session.scheduledFor)}${session.topic ? ` · ${session.topic}` : ""}`}
      />

      {window.open ? (
        <CallRoom
          domain={meetingDomainOf(settings.meetingDomain)}
          room={callRoomFor(session.id)}
          displayName={formatFullName(member.firstName, member.middleName, member.lastName)}
          otherName={mentorship.alumni.fullName}
          leaveHref={back}
        />
      ) : (
        <p role="status" className="rounded-lg border border-warning bg-warning-light px-4 py-3 text-ink">
          {window.message}
        </p>
      )}
    </div>
  );
}
