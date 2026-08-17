import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
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

export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const claims = await getMemberClaims();
  if (!claims) return null;
  const member = await db.member.findUnique({ where: { id: claims.sub } });
  if (!member || member.status !== "ACTIVE") return null;
  return member;
});

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/membership/login");
  }
  return member;
}
