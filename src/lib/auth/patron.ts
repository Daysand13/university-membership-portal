import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
import { db } from "@/lib/db";
import type { PatronProfile } from "@/generated/prisma/client";

/**
 * The Patrons' Portal session. Its own cookie, like the admin one: patrons
 * aren't students or alumni, so they sign in separately (/patrons/login) and
 * nothing here reads or grants student or alumni access.
 */
export const PATRON_SESSION_COOKIE = "patron_session";

interface PatronClaims extends JWTPayload {
  sub: string;
  type: "patron";
}

/** `remember` unchecked gives a browser-session cookie, gone when the browser closes. */
export async function createPatronSession(patron: Pick<PatronProfile, "id">, remember: boolean) {
  const token = await createSessionToken({ sub: patron.id, type: "patron" });
  const cookieStore = await cookies();
  cookieStore.set(PATRON_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE_SECONDS } : {}),
  });
}

export async function destroyPatronSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PATRON_SESSION_COOKIE);
}

export async function getPatronClaims(): Promise<PatronClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PATRON_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken<PatronClaims>(token);
  if (!payload || payload.type !== "patron") return null;
  return payload;
}

/**
 * The signed-in patron — only while their account is approved, so a patron
 * suspended mid-session loses access on their next page load.
 */
export const getCurrentPatron = cache(async (): Promise<PatronProfile | null> => {
  const claims = await getPatronClaims();
  if (!claims) return null;
  const patron = await db.patronProfile.findUnique({ where: { id: claims.sub } });
  return patron && patron.status === "APPROVED" ? patron : null;
});

export async function requirePatron(): Promise<PatronProfile> {
  const patron = await getCurrentPatron();
  if (!patron) redirect("/patrons/login");
  return patron;
}
