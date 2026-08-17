import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { JWTPayload } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";
import { db } from "@/lib/db";
import { AdminRole, type AdminUser } from "@/generated/prisma/client";

export const ADMIN_SESSION_COOKIE = "admin_session";

interface AdminClaims extends JWTPayload {
  sub: string;
  role: AdminRole;
  type: "admin";
}

export async function createAdminSession(admin: Pick<AdminUser, "id" | "role">) {
  const token = await createSessionToken({ sub: admin.id, role: admin.role, type: "admin" });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Fast, edge-safe claim check (JWT only, no DB hit). Good enough for
 * middleware's redirect-if-missing pass. Do not use this alone to authorize
 * a sensitive action — use requireAdminUser for that.
 */
export async function getAdminClaims(): Promise<AdminClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken<AdminClaims>(token);
  if (!payload || payload.type !== "admin") return null;
  return payload;
}

/**
 * Authoritative check for Server Components / Server Actions: re-reads the
 * admin from the database so a deactivated account or role change takes
 * effect immediately, rather than waiting out a stale 7-day JWT.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const claims = await getAdminClaims();
  if (!claims) return null;
  const admin = await db.adminUser.findUnique({ where: { id: claims.sub } });
  if (!admin || !admin.isActive) return null;
  return admin;
});

export async function requireAdminUser(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

/**
 * Guards an action to specific roles. Super admins always pass.
 */
export async function requireAdminRole(...roles: AdminRole[]): Promise<AdminUser> {
  const admin = await requireAdminUser();
  if (admin.role === AdminRole.SUPER_ADMIN) return admin;
  if (!roles.includes(admin.role)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return admin;
}
