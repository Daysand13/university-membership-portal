import "server-only";
import { createHmac } from "node:crypto";

/**
 * The name of the room a session's call happens in.
 *
 * Derived from the session's id with the site's own secret, so it is
 * stable, needs no column, works for sessions booked before any of this
 * existed — and cannot be worked out from an id somebody saw in a URL.
 *
 * Prefixed, because these rooms live on a shared public meeting service
 * where a plain name like "session-3" would collide with half the world.
 */
export function callRoomFor(sessionId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set, so a private call room can't be named.");
  const digest = createHmac("sha256", secret).update(`mentorship-call:${sessionId}`).digest("base64url");
  return `assnuew-${digest.slice(0, 28)}`;
}
