import "server-only";
import { createHmac } from "node:crypto";

/**
 * The name of the room a mentorship's calls happen in.
 *
 * One room per mentorship, whichever of them starts the call and whether or
 * not a session was booked, so the two of them always arrive in the same
 * place. Derived from the mentorship's id with the site's own secret, so it
 * is stable, needs no column — and cannot be worked out from an id
 * somebody saw in a URL.
 *
 * Prefixed, because on a shared meeting service a plain name like
 * "mentorship-3" would collide with half the world.
 */
export function callRoomForMentorship(mentorshipId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set, so a private call room can't be named.");
  const digest = createHmac("sha256", secret).update(`mentorship-room:${mentorshipId}`).digest("base64url");
  // Letters and digits only: some Jitsi servers are fussy about "-" and "_".
  return `assnuew${digest.replace(/[^A-Za-z0-9]/g, "").slice(0, 28)}`;
}
