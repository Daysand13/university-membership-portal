import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
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

export const getCurrentAlumni = cache(async (): Promise<AlumniProfile | null> => {
  const claims = await getAlumniClaims();
  if (!claims) return null;
  const alumni = await db.alumniProfile.findUnique({ where: { id: claims.sub } });
  if (!alumni || alumni.status !== "ACTIVE") return null;
  return alumni;
});

export async function requireAlumni(): Promise<AlumniProfile> {
  const alumni = await getCurrentAlumni();
  if (!alumni) {
    redirect("/alumni?next=login");
  }
  return alumni;
}
