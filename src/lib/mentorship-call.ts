/**
 * Talking to your mentor without leaving the site.
 *
 * A mentorship is often between a student in Winneba and a graduate who
 * has moved away, and typing at each other is a poor substitute for a
 * conversation — especially for a member who finds reading and writing
 * slow. So either side can call the other at any time while the mentorship
 * is active, for as long as they like, with or without video. A booked
 * session is a reminder of when, not a gate on whether.
 *
 * The room is not a page we host. It is a meeting on a Jitsi service, and
 * we supply only the name of the room and who may be in it. Which service
 * matters, because the free public one (meet.jit.si) cuts off any call
 * embedded in another website after five minutes. See meetingMode below,
 * and docs/mentorship-calls.md for the options.
 *
 * Plain functions, no database, so every rule here is tested.
 */

/** How often a browser in a call says it is still there. */
export const HEARTBEAT_MS = 45_000;

/**
 * How long a call is considered still going after the last check-in.
 * A little over two missed heartbeats: a browser that closed without
 * saying goodbye ends its call, but a slow connection does not.
 */
export const LIVE_GRACE_MS = 2 * 60_000;

/** The public Jitsi server, free and with no account to manage. */
export const PUBLIC_JITSI = "meet.jit.si";

export interface CallTimes {
  startedAt: Date;
  answeredAt: Date | null;
  /** The last check-in from anybody. */
  lastSeenAt: Date;
  /** Each side's last check-in; null once they have left. */
  studentSeenAt: Date | null;
  mentorSeenAt: Date | null;
  endedAt: Date | null;
}

type Presence = Pick<CallTimes, "studentSeenAt" | "mentorSeenAt" | "endedAt">;

// `!= null`, not `!== null`: a row read before these columns existed has them undefined.
const recent = (seen: Date | null | undefined, now: Date) => seen != null && now.getTime() - seen.getTime() <= LIVE_GRACE_MS;

/**
 * Who is in the call now. Somebody is in it from their first check-in
 * until they press Leave — or, if their browser simply closes, a couple of
 * minutes after it last checked in.
 */
export function whoIsIn(call: Presence, now: Date = new Date()): { student: boolean; mentor: boolean } {
  if (call.endedAt) return { student: false, mentor: false };
  return { student: recent(call.studentSeenAt, now), mentor: recent(call.mentorSeenAt, now) };
}

/** Whether anybody is (still) in this call. */
export function isCallLive(call: Presence, now: Date = new Date()): boolean {
  const inCall = whoIsIn(call, now);
  return inCall.student || inCall.mentor;
}

/** When a call ended — the last check-in, which for the last to leave is when they left — or null while it goes on. */
export function callEndedAt(call: Presence & Pick<CallTimes, "lastSeenAt">, now: Date = new Date()): Date | null {
  if (call.endedAt) return call.endedAt;
  return isCallLive(call, now) ? null : call.lastSeenAt;
}

/**
 * How long the two of them actually talked, in whole minutes: from when
 * the second person came in. Null for a call nobody answered.
 */
export function minutesTalked(call: CallTimes, now: Date = new Date()): number | null {
  if (!call.answeredAt) return null;
  const end = callEndedAt(call, now) ?? now;
  return Math.max(0, Math.round((end.getTime() - call.answeredAt.getTime()) / 60_000));
}

/** "34 minutes", "under a minute", "unanswered", for the call history. */
export function describeCallLength(call: CallTimes, now: Date = new Date()): string {
  const minutes = minutesTalked(call, now);
  if (minutes === null) return isCallLive(call, now) ? "ringing" : "not answered";
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hour${hours === 1 ? "" : "s"}${rest ? ` ${rest} minute${rest === 1 ? "" : "s"}` : ""}`;
}

/** The meeting service the association uses, as a bare domain. */
export function meetingDomainOf(configured: string | null | undefined): string {
  const trimmed = (configured ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return trimmed || PUBLIC_JITSI;
}

/**
 * How a call can be held, given the service.
 *
 *  - "jaas": Jitsi as a Service (8x8), set up with the association's own
 *    account. Embedded in the page, no time limit, only people the site
 *    gives a signed pass to can get in, and the mentor runs the room.
 *  - "embed": the association's own Jitsi server. Embedded, and whatever
 *    limits that server sets, which by default is none.
 *  - "new-tab": the public meet.jit.si. It ends embedded calls after five
 *    minutes, so the call opens on meet.jit.si itself instead, where it
 *    doesn't. Honest, if less tidy.
 */
export type MeetingMode = "jaas" | "embed" | "new-tab";

export function meetingMode(domain: string, jaasConfigured: boolean): MeetingMode {
  if (jaasConfigured) return "jaas";
  return domain === PUBLIC_JITSI ? "new-tab" : "embed";
}

/**
 * Whether to tell the other side a call has started. Somebody who drops
 * out and rejoins three times should not set the other person's phone off
 * three times.
 */
export const RING_AGAIN_AFTER_MS = 10 * 60_000;

export function shouldRing(lastCallStartedAt: Date | null, now: Date = new Date()): boolean {
  return !lastCallStartedAt || now.getTime() - lastCallStartedAt.getTime() >= RING_AGAIN_AFTER_MS;
}

/** Everything a browser needs to join a call; made by lib/server/meeting.ts. */
export interface MeetingSetup {
  mode: MeetingMode;
  /** The host the External API talks to. */
  domain: string;
  scriptUrl: string;
  /** The room, as the External API wants it named. */
  roomName: string;
  jwt: string | null;
  /** The same room in a tab of its own. */
  joinUrl: string;
  /** Runs the room: can let people in from the waiting room, or not. */
  moderator: boolean;
}
