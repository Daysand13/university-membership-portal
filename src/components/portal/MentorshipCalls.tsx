import Link from "next/link";
import { Phone, PhoneIncoming } from "lucide-react";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { buttonClasses } from "@/components/ui/Button";
import { describeCallLength, isCallLive, whoIsIn } from "@/lib/mentorship-call";

const when = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export interface CallRecord {
  id: string;
  startedBy: "STUDENT" | "MENTOR";
  withVideo: boolean;
  startedAt: Date;
  answeredAt: Date | null;
  lastSeenAt: Date;
  studentSeenAt: Date | null;
  mentorSeenAt: Date | null;
  endedAt: Date | null;
}

/**
 * Calling, on a mentorship's conversation page: the button, a notice when
 * the other side is in a call waiting, and the last few calls. The same in
 * both portals; `viewer` says which side is "you".
 */
export function MentorshipCalls({
  calls,
  viewer,
  otherName,
  callHref,
  active,
  now = new Date(),
}: {
  calls: CallRecord[];
  viewer: "STUDENT" | "MENTOR";
  otherName: string;
  callHref: string;
  active: boolean;
  now?: Date;
}) {
  const live = calls.find((call) => isCallLive(call, now));
  const inCall = live ? whoIsIn(live, now) : { student: false, mentor: false };
  const otherIsIn = viewer === "STUDENT" ? inCall.mentor : inCall.student;
  const firstName = otherName.split(" ")[0];
  const who = (call: CallRecord) => (call.startedBy === viewer ? "You called" : `${firstName} called`);

  return (
    <DashboardCard id="calls" title="Calls" icon={<Phone size={20} />}>
      {active && live ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success bg-success-light px-4 py-3">
          <p className="font-semibold text-ink">
            <PhoneIncoming size={16} aria-hidden="true" className="mr-1.5 inline" />
            {otherIsIn
              ? `${otherName} is in a call now, waiting for you.`
              : `You have a call open, started ${when.format(live.startedAt)}.`}
          </p>
          <Link href={callHref} className={buttonClasses("primary", "sm")}>
            Join the call
          </Link>
        </div>
      ) : active ? (
        <div className="flex flex-wrap items-center gap-4">
          <Link href={callHref} className={buttonClasses("primary", "md")}>
            <Phone size={16} aria-hidden="true" /> Call {firstName}
          </Link>
          <p className="text-sm text-slate max-w-md">
            Voice or video, at any time, for as long as you like. {firstName} is told you are calling. Nothing is
            recorded.
          </p>
        </div>
      ) : (
        <p className="text-slate">This mentorship has ended, so there are no more calls.</p>
      )}

      {calls.length > 0 && (
        <div className="mt-5 pt-4 border-t border-line">
          <h3 className="text-sm font-semibold text-primary-950 mb-2">Recent calls</h3>
          <ul className="space-y-1.5">
            {calls.map((call) => (
              <li key={call.id} className="text-sm text-slate">
                {when.format(call.startedAt)} · {who(call)} · {call.withVideo ? "video" : "voice"} ·{" "}
                {isCallLive(call, now) ? "going on now" : describeCallLength(call, now)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}
