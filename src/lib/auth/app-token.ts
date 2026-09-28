import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { AppAudience } from "@/generated/prisma/client";

/**
 * How a phone proves who it is.
 *
 * The website keeps a signed token in a cookie for seven days. That is fine
 * for a browser on somebody's own laptop, but a phone is lost, sold and
 * stolen, and a cookie session cannot be ended early. So the app gets two
 * things instead:
 *
 *  - an ACCESS token, signed and short-lived, which every request carries
 *    and which nothing needs to look up;
 *  - a REFRESH token, which is a long random string kept only as a hash in
 *    the mobile_devices table, and which can therefore be revoked.
 *
 * The access token says `aud: "assn-app"`. The website's cookie sessions do
 * not, and verifySessionToken does not check it — so this is belt and
 * braces rather than the only thing keeping the two apart, but it means a
 * token lifted from a phone cannot be pasted in as a website cookie, and a
 * cookie cannot be presented as an app token.
 */

const encoder = new TextEncoder();

export const APP_AUDIENCE = "assn-app";
/** Short, because it cannot be revoked — the refresh token is the long one. */
export const ACCESS_TOKEN_SECONDS = 15 * 60;
/** How long a phone can be left alone and still not have to sign in again. */
export const REFRESH_TOKEN_DAYS = 60;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is not set (or too short). Set a long random value in your environment.");
  }
  return encoder.encode(secret);
}

export interface AppTokenClaims extends JWTPayload {
  /** The member, alumni profile or patron id. */
  sub: string;
  audience: AppAudience;
  /** The device row, so a revoked phone stops working within the access window. */
  device: string;
}

export async function createAccessToken(claims: {
  subject: string;
  audience: AppAudience;
  deviceId: string;
}): Promise<string> {
  return new SignJWT({ audience: claims.audience, device: claims.deviceId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.subject)
    .setAudience(APP_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AppTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: APP_AUDIENCE });
    const claims = payload as AppTokenClaims;
    if (!claims.sub || !claims.audience || !claims.device) return null;
    return claims;
  } catch {
    // Expired, wrong signature, or a cookie session being tried on here.
    return null;
  }
}

/** A refresh token: shown to the phone once, kept here only as a hash. */
export function mintRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The Authorization header, or null if it isn't a bearer token. */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}
