import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
import { getUserClaims } from "./user";
import { db } from "@/lib/db";
import { type AlumniProfile } from "@/generated/prisma/client";

export const ALUMNI_SESSION_COOKIE = "alumni_session";

interface AlumniClaims extends JWTPayload {
  sub: string;
  type: "alumni";
}

export async function createAlumniSession(alumni: Pick<AlumniProfile, "id">) {
  const token = await createSessionToken({ sub: alumni.id, type: "alumni" });
  const cookieStore = await cookies();
  cookieStore.set(ALUMNI_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** "Remember me" unchecked: session cookie disappears when the browser
 * closes, rather than persisting for the usual 7 days. */
export async function createAlumniSessionNonPersistent(alumni: Pick<AlumniProfile, "id">) {
  const token = await createSessionToken({ sub: alumni.id, type: "alumni" });
  const cookieStore = await cookies();
  cookieStore.set(ALUMNI_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge/expires — a session cookie, cleared when the browser closes.
  });
}

export async function destroyAlumniSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ALUMNI_SESSION_COOKIE);
}

export async function getAlumniClaims(): Promise<AlumniClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ALUMNI_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken<AlumniClaims>(token);
  if (!payload || payload.type !== "alumni") return null;
  return payload;
}

/**
 * Resolves the signed-in alumnus from EITHER session cookie — the legacy
 * alumni_session first so existing sessions survive, then the unified
 * user_session. Mirrors the dual-read in auth/member.ts; see the comment
 * there for why both are read during the identity migration.
 */
export const getCurrentAlumni = cache(async (): Promise<AlumniProfile | null> => {
  const claims = await getAlumniClaims();
  if (claims) {
    const alumni = await db.alumniProfile.findUnique({ where: { id: claims.sub } });
    if (alumni && alumni.status === "ACTIVE") return alumni;
  }

  const userClaims = await getUserClaims();
  if (!userClaims) return null;

  return db.alumniProfile.findFirst({
    where: {
      userId: userClaims.sub,
      status: "ACTIVE",
      user: { roles: { some: { role: "ALUMNI" } } },
    },
  });
});

export async function requireAlumni(): Promise<AlumniProfile> {
  const alumni = await getCurrentAlumni();
  if (!alumni) {
    redirect("/alumni/login");
  }
  return alumni;
}
