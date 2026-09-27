/**
 * Talking to your mentor without leaving the site.
 *
 * A mentorship is often between a student in Winneba and a graduate who
 * has moved away, and typing at each other is a poor substitute for
 * twenty minutes of conversation — especially for a member who finds
 * reading and writing slow. Once a session is on the books, both sides
 * get a room they can talk in, with or without video.
 *
 * The room is not a page we host. It is a meeting on whatever service the
 * association points at — Jitsi's public instance to begin with, which
 * costs nothing and needs no account — and we supply only the name of the
 * room and who is in it.
 *
 * The name is derived from the session's id with the site's own secret,
 * so it cannot be guessed from the id and nobody needs a column for it.
 * Two people who were told the name could in principle rejoin later, so
 * the window below is a courtesy rather than a lock: the page itself
 * checks that whoever is asking is one of the two in that mentorship.
 */

/** How long before the appointed time the room opens. */
export const OPENS_MINUTES_BEFORE = 15;
/** And how long after it before we stop offering it. */
export const CLOSES_HOURS_AFTER = 3;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export type CallWindow =
  | { open: true }
  | { open: false; reason: "too-early" | "too-late" | "not-scheduled"; message: string };

const timeFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

/**
 * Whether the call can be joined now.
 *
 * Early enough to settle in, late enough that a session which ran over
 * doesn't cut out, and nothing at all for a session that was cancelled or
 * has already been marked done.
 */
export function callWindow(
  session: { scheduledFor: Date; status: string },
  now: Date = new Date(),
): CallWindow {
  if (session.status !== "SCHEDULED") {
    return {
      open: false,
      reason: "not-scheduled",
      message: "This session is closed, so its call room is closed too.",
    };
  }

  const opensAt = session.scheduledFor.getTime() - OPENS_MINUTES_BEFORE * MINUTE;
  const closesAt = session.scheduledFor.getTime() + CLOSES_HOURS_AFTER * HOUR;

  if (now.getTime() < opensAt) {
    return {
      open: false,
      reason: "too-early",
      message: `The call opens ${OPENS_MINUTES_BEFORE} minutes before the session, at ${timeFormat.format(
        new Date(opensAt),
      )}.`,
    };
  }
  if (now.getTime() > closesAt) {
    return {
      open: false,
      reason: "too-late",
      message: "This session's call room has closed. Book another session to talk again.",
    };
  }
  return { open: true };
}

/** The meeting service the association uses, as a bare domain. */
export function meetingDomainOf(configured: string | null | undefined): string {
  const trimmed = (configured ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return trimmed || "meet.jit.si";
}
