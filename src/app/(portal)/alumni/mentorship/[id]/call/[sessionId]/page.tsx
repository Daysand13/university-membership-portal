import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { getMentorshipForMentor } from "@/lib/services/mentorship-service";
import { getSiteSettings } from "@/lib/services/content-service";
import { callWindow, meetingDomainOf } from "@/lib/mentorship-call";
import { callRoomFor } from "@/lib/server/call-room";
import { formatSessionTime } from "@/lib/portal-options";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CallRoom } from "@/components/portal/CallRoom";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Call your student" };
export const dynamic = "force-dynamic";

/**
 * A mentor joining the call for one of their sessions. The student's page
 * is the same thing from the other side, and both work out the room from
 * the session id rather than carrying it in the address bar.
 */
export default async function MentorSessionCallPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const alumnus = await requireAlumni();
  const { id, sessionId } = await params;
  const mentorship = await getMentorshipForMentor({ alumniId: alumnus.id, id });
  if (!mentorship) notFound();

  const session = mentorship.sessions.find((s) => s.id === sessionId);
  if (!session) notFound();

  const student = formatFullName(
    mentorship.member.firstName,
    mentorship.member.middleName,
    mentorship.member.lastName,
  );
  const back = `/alumni/mentorship/${id}`;
  const window = callWindow(session);
  const settings = await getSiteSettings();

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
        <ArrowLeft size={15} aria-hidden="true" /> Back to the conversation
      </Link>

      <PortalPageHeader
        title={`Call with ${student}`}
        description={`${formatSessionTime(session.scheduledFor)}${session.topic ? ` · ${session.topic}` : ""}`}
      />

      {window.open ? (
        <CallRoom
          domain={meetingDomainOf(settings.meetingDomain)}
          room={callRoomFor(session.id)}
          displayName={alumnus.fullName}
          otherName={student}
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
