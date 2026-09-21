import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * The slip a terminal is handed once a voter has been checked.
 *
 * Verification and voting are two separate requests — a voter is checked
 * at the keypad, then spends a few minutes reading the ballot — and the
 * second one has to prove the first one happened without the terminal
 * simply asserting it. So verification returns a signed token naming the
 * member and the election, and the ballot is only accepted with it.
 *
 * The member's name travels no further than this: the server reads the
 * token, marks the roll and stores a ballot that carries nobody's name.
 *
 * It lasts until well after voting closes rather than a few minutes,
 * because a terminal that loses its line queues the vote and sends it when
 * the line comes back. It can still only be used once — the roll has a
 * unique row per member per election, and the second attempt hits it.
 *
 * Signed with the session secret but typed differently, so a session
 * cookie and a voting slip can never stand in for one another.
 */

const TOKEN_TYPE = "ballot-voter";
/** How long after voting closes a queued ballot is still accepted. */
export const LATE_BALLOT_GRACE_HOURS = 6;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set (or too short) — required to sign voting slips.");
  }
  return new TextEncoder().encode(secret);
}

export async function signBallotToken(params: {
  memberId: string;
  electionId: string;
  /** When the slip stops being accepted — closing time plus the grace period. */
  expiresAt: Date;
}): Promise<string> {
  return new SignJWT({ type: TOKEN_TYPE, election: params.electionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.memberId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(params.expiresAt.getTime() / 1000))
    .sign(secretKey());
}

/** The voter and election a slip was issued for, or null if it isn't a valid, unexpired slip. */
export async function readBallotToken(token: string): Promise<{ memberId: string; electionId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.type !== TOKEN_TYPE || typeof payload.sub !== "string" || typeof payload.election !== "string") {
      return null;
    }
    return { memberId: payload.sub, electionId: payload.election };
  } catch {
    return null;
  }
}
