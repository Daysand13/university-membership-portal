import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
import { getUserClaims } from "./user";
import { db } from "@/lib/db";
import { type Member } from "@/generated/prisma/client";

export const MEMBER_SESSION_COOKIE = "member_session";

interface MemberClaims extends JWTPayload {
  sub: string;
  type: "member";
}

export async function createMemberSession(member: Pick<Member, "id">) {
  const token = await createSessionToken({ sub: member.id, type: "member" });
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_SESSION_COOKIE);
}

export async function getMemberClaims(): Promise<MemberClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken<MemberClaims>(token);
  if (!payload || payload.type !== "member") return null;
  return payload;
}

/**
 * Resolves the signed-in member from EITHER session cookie.
 *
 * The legacy member_session is checked first so anyone already signed in
 * stays signed in, then the unified user_session is tried. Reading both is
 * what makes the identity migration invisible: every page that calls this
 * keeps working unchanged whichever way the person logged in, and no one is
 * forced to re-authenticate on the day the new login ships.
 *
 * Once the legacy login is retired, the first branch is what goes.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const claims = await getMemberClaims();
  if (claims) {
    const member = await db.member.findUnique({ where: { id: claims.sub } });
    if (member && member.status === "ACTIVE") return member;
  }

  const userClaims = await getUserClaims();
  if (!userClaims) return null;

  const member = await db.member.findFirst({
    where: {
      userId: userClaims.sub,
      status: "ACTIVE",
      // Student access follows the MEMBER role, so it can be revoked (or
      // granted, for dual status) without touching the member record.
      user: { roles: { some: { role: "MEMBER" } } },
    },
  });
  return member;
});

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/membership/login");
  }
  return member;
}
