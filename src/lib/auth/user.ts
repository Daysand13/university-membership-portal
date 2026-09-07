import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
import { db } from "@/lib/db";
import type { User, UserRoleName } from "@/generated/prisma/client";

export const USER_SESSION_COOKIE = "user_session";

interface UserClaims extends JWTPayload {
  sub: string;
  type: "user";
}

/**
 * A signed-in person, with everything needed to decide where they belong.
 *
 * The legacy Member / AlumniProfile rows come along because the rest of the
 * app still reads them — see the dual-read in auth/member.ts and
 * auth/alumni.ts, which is what lets a unified session work on every
 * existing page without those pages being rewritten.
 */
export interface SessionUser {
  user: User;
  roles: UserRoleName[];
  memberId: string | null;
  alumniId: string | null;
  adminId: string | null;
}

export async function createUserSession(user: Pick<User, "id">) {
  const token = await createSessionToken({ sub: user.id, type: "user" });
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** "Remember me" unchecked: cleared when the browser closes. */
export async function createUserSessionNonPersistent(user: Pick<User, "id">) {
  const token = await createSessionToken({ sub: user.id, type: "user" });
  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_SESSION_COOKIE);
}

export async function getUserClaims(): Promise<UserClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken<UserClaims>(token);
  if (!payload || payload.type !== "user") return null;
  return payload;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const claims = await getUserClaims();
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.sub },
    include: {
      roles: true,
      member: { select: { id: true, status: true } },
      alumniProfile: { select: { id: true, status: true } },
      adminUser: { select: { id: true, isActive: true } },
    },
  });
  if (!user) return null;

  // A suspended member or alumnus keeps their identity but loses that role's
  // access, rather than losing the whole login — someone suspended as a
  // student shouldn't also be locked out of their alumni side.
  const roles = user.roles
    .map((r) => r.role)
    .filter((role) => {
      if (role === "MEMBER") return user.member?.status === "ACTIVE";
      if (role === "ALUMNI") return user.alumniProfile?.status === "ACTIVE";
      if (role === "ADMIN") return user.adminUser?.isActive === true;
      return false;
    });

  return {
    user,
    roles,
    memberId: user.member?.id ?? null,
    alumniId: user.alumniProfile?.id ?? null,
    adminId: user.adminUser?.id ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return session;
}

export function hasRole(session: SessionUser, role: UserRoleName): boolean {
  return session.roles.includes(role);
}

/**
 * Where a person lands after signing in. Someone holding both student and
 * alumni standing is asked which portal they want rather than being guessed
 * at — that choice is the whole point of dual status.
 */
export function landingPathFor(roles: UserRoleName[]): string {
  const isMember = roles.includes("MEMBER");
  const isAlumni = roles.includes("ALUMNI");

  if (isMember && isAlumni) return "/portal";
  if (isMember) return "/membership/dashboard";
  if (isAlumni) return "/alumni/dashboard";
  if (roles.includes("ADMIN")) return "/admin";
  return "/";
}
