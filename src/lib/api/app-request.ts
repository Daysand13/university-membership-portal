import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { AlumniProfile, AppAudience, Member, PatronProfile } from "@/generated/prisma/client";
import { bearerFrom, verifyAccessToken } from "@/lib/auth/app-token";
import { activeDevice } from "@/lib/services/mobile-device-service";

/**
 * The door the Android app comes in by.
 *
 * Three checks, in this order, because each is cheaper than the next: the
 * token is signed and unexpired and meant for the app; the phone it was
 * issued to has not been revoked; and the person is still someone the
 * association lets in. The last one is the same rule the website applies —
 * an ACTIVE member, an ACTIVE graduate, an APPROVED patron — read from the
 * database on every request, so suspending somebody takes effect at once
 * rather than whenever their token happens to expire.
 *
 * Nothing here trusts the app. What a phone may see is decided here and in
 * the services below it, never by which buttons the app chose to draw.
 */

export type AppActor =
  | { audience: "MEMBER"; deviceId: string; member: Member }
  | { audience: "ALUMNI"; deviceId: string; alumni: AlumniProfile }
  | { audience: "PATRON"; deviceId: string; patron: PatronProfile };

export type AppAuth = { actor: AppActor } | { response: NextResponse };

/** The one shape every app endpoint answers in. */
export function appError(error: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ ok: false, error, ...(code ? { code } : {}) }, { status });
}

export function appJson<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" }, ...init });
}

/**
 * `code: "session_expired"` is the app's cue to use its refresh token and
 * try once more. Anything else it should treat as "sign in again".
 */
export async function requireAppActor(request: NextRequest): Promise<AppAuth> {
  const token = bearerFrom(request.headers.get("authorization"));
  if (!token) return { response: appError("Please sign in.", 401, "no_token") };

  const claims = await verifyAccessToken(token);
  if (!claims) return { response: appError("Your session has expired.", 401, "session_expired") };

  const device = await activeDevice(claims.device);
  if (!device) return { response: appError("This phone has been signed out.", 401, "device_revoked") };

  const actor = await loadActor(claims.audience, claims.sub, claims.device);
  if (!actor) return { response: appError("This account is no longer active.", 403, "account_inactive") };

  return { actor };
}

/** The same endpoint for everybody, but only for one kind of person. */
export async function requireAppAudience(
  request: NextRequest,
  audience: AppAudience,
): Promise<AppAuth> {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth;
  if (auth.actor.audience !== audience) {
    return { response: appError("This isn't available to your account.", 403, "wrong_audience") };
  }
  return auth;
}

async function loadActor(
  audience: AppAudience,
  subjectId: string,
  deviceId: string,
): Promise<AppActor | null> {
  if (audience === "MEMBER") {
    const member = await db.member.findUnique({ where: { id: subjectId } });
    return member && member.status === "ACTIVE" ? { audience: "MEMBER", deviceId, member } : null;
  }
  if (audience === "ALUMNI") {
    const alumni = await db.alumniProfile.findUnique({ where: { id: subjectId } });
    return alumni && alumni.status === "ACTIVE" ? { audience: "ALUMNI", deviceId, alumni } : null;
  }
  const patron = await db.patronProfile.findUnique({ where: { id: subjectId } });
  return patron && patron.status === "APPROVED" ? { audience: "PATRON", deviceId, patron } : null;
}

/** Whoever it is, by id — for the endpoints that don't care which portal. */
export function actorId(actor: AppActor): string {
  if (actor.audience === "MEMBER") return actor.member.id;
  if (actor.audience === "ALUMNI") return actor.alumni.id;
  return actor.patron.id;
}
