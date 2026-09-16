import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Password-reset links for patrons, without a token table.
 *
 * The link carries a signed token that names the patron, expires in 30
 * minutes, and includes a fingerprint of the patron's password hash at the
 * moment it was issued. Setting a new password changes that hash (bcrypt
 * salts every hash), so the fingerprint stops matching and the same link
 * can't be used twice — nor after the patron changes their password some
 * other way. It's signed with the session secret but typed differently from
 * a session token, so neither can stand in for the other.
 */

export const PATRON_RESET_TTL_MINUTES = 30;
const TOKEN_TYPE = "patron-password-reset";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set (or too short) — required to sign patron password reset links.");
  }
  return new TextEncoder().encode(secret);
}

export function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 32);
}

export async function signPatronResetToken(patron: { id: string; passwordHash: string }): Promise<string> {
  return new SignJWT({ type: TOKEN_TYPE, pwf: passwordFingerprint(patron.passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(patron.id)
    .setIssuedAt()
    .setExpirationTime(`${PATRON_RESET_TTL_MINUTES}m`)
    .sign(secretKey());
}

/** The patron and fingerprint a reset link was issued for, or null if it isn't a valid, unexpired reset link. */
export async function readPatronResetToken(token: string): Promise<{ patronId: string; fingerprint: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.type !== TOKEN_TYPE || typeof payload.sub !== "string" || typeof payload.pwf !== "string") return null;
    return { patronId: payload.sub, fingerprint: payload.pwf };
  } catch {
    return null;
  }
}
