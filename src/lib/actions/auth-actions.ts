"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validations/content";
import { memberLoginSchema, unifiedLoginSchema } from "@/lib/validations/membership";
import { alumniLoginSchema, alumniRegisterSchema } from "@/lib/validations/alumni";
import { authenticateAdmin } from "@/lib/services/admin-auth-service";
import { authenticateMember, AccountNotActiveError, InvalidCredentialsError } from "@/lib/services/membership-service";
import {
  authenticateAlumni,
  registerAlumni,
  InvalidAlumniCredentialsError,
  AlumniAccountNotActiveError,
  AlumniPasswordNotSetError,
  DuplicateAlumniEmailError,
} from "@/lib/services/alumni-service";
import {
  authenticateUser,
  getActiveRolesForUser,
  InvalidLoginError,
  NoActiveRoleError,
  PasswordNotSetError,
} from "@/lib/services/user-service";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/admin";
import { createMemberSession, destroyMemberSession } from "@/lib/auth/member";
import { createAlumniSession, createAlumniSessionNonPersistent, destroyAlumniSession } from "@/lib/auth/alumni";
import {
  createUserSession,
  createUserSessionNonPersistent,
  destroyUserSession,
  landingPathFor,
} from "@/lib/auth/user";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { isLikelyBot } from "@/lib/bot-protection";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Unified gateway — one login for members, alumni, and people who are both
// ---------------------------------------------------------------------------

async function unifiedLoginActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const entries = Object.fromEntries(formData);
  const parsed = unifiedLoginSchema.safeParse({
    ...entries,
    rememberMe: entries.rememberMe === "on" || entries.rememberMe === "true",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  const [ipLimit, identifierLimit] = await Promise.all([
    // Generous per-IP, since a whole campus can share one address.
    checkRateLimit(`login:ip:${ip}`, { max: 40, windowSeconds: 600 }),
    checkRateLimit(`login:id:${parsed.data.identifier.toLowerCase()}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !identifierLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  let user;
  try {
    user = await authenticateUser(parsed.data.identifier, parsed.data.password);
  } catch (err) {
    if (
      err instanceof InvalidLoginError ||
      err instanceof NoActiveRoleError ||
      err instanceof PasswordNotSetError
    ) {
      return { error: err.message };
    }
    console.error("[unified-login]", err);
    return { error: "Something went wrong. Please try again." };
  }

  if (parsed.data.rememberMe) {
    await createUserSession(user);
  } else {
    await createUserSessionNonPersistent(user);
  }

  const roles = await getActiveRolesForUser(user.id);
  if (roles.length === 0) {
    // Authenticated, but every role's underlying record is suspended or
    // inactive — don't strand them on a portal they can't use.
    await destroyUserSession();
    return { error: new NoActiveRoleError().message };
  }

  redirect(landingPathFor(roles));
}

async function unifiedLogoutActionImpl(): Promise<void> {
  // Clear every session kind, not just the unified one: someone may still be
  // holding a legacy member or alumni cookie from before the migration, and a
  // logout that leaves one of those behind isn't a logout.
  await destroyUserSession();
  await destroyMemberSession();
  await destroyAlumniSession();
  redirect("/login");
}

async function adminLoginActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`admin-login:ip:${ip}`, { max: 15, windowSeconds: 600 }),
    checkRateLimit(`admin-login:email:${parsed.data.email}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  let admin;
  try {
    admin = await authenticateAdmin(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) return { error: err.message };
    console.error("[admin-login]", err);
    return { error: "Something went wrong. Please try again." };
  }

  await createAdminSession(admin);
  redirect("/admin");
}

async function adminLogoutActionImpl(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

async function memberLoginActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  const [ipLimit, indexLimit] = await Promise.all([
    // Set generously — a campus network can have many different students
    // logging in from the same shared IP at once.
    checkRateLimit(`member-login:ip:${ip}`, { max: 40, windowSeconds: 600 }),
    checkRateLimit(`member-login:index:${parsed.data.indexNumber}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !indexLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  let member;
  try {
    member = await authenticateMember(parsed.data.indexNumber, parsed.data.password);
  } catch (err) {
    if (err instanceof InvalidCredentialsError || err instanceof AccountNotActiveError) {
      return { error: err.message };
    }
    console.error("[member-login]", err);
    return { error: "Something went wrong. Please try again." };
  }

  await createMemberSession(member);
  redirect("/membership/dashboard");
}

async function memberLogoutActionImpl(): Promise<void> {
  await destroyMemberSession();
  redirect("/");
}

async function alumniLoginActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alumniLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`alumni-login:ip:${ip}`, { max: 20, windowSeconds: 600 }),
    checkRateLimit(`alumni-login:email:${parsed.data.email}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  let alumni;
  try {
    alumni = await authenticateAlumni(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (
      err instanceof InvalidAlumniCredentialsError ||
      err instanceof AlumniAccountNotActiveError ||
      err instanceof AlumniPasswordNotSetError
    ) {
      return { error: err.message };
    }
    console.error("[alumni-login]", err);
    return { error: "Something went wrong. Please try again." };
  }

  if (parsed.data.rememberMe) {
    await createAlumniSession(alumni);
  } else {
    await createAlumniSessionNonPersistent(alumni);
  }
  redirect("/alumni/dashboard");
}

async function alumniLogoutActionImpl(): Promise<void> {
  await destroyAlumniSession();
  redirect("/alumni");
}

async function alumniRegisterActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Silently pretend success for anything that looks automated.
  if (isLikelyBot(formData)) redirect("/alumni?next=login");

  const ip = await getClientIp();
  const limit = await checkRateLimit(`alumni-register:ip:${ip}`, { max: 10, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const entries = Object.fromEntries(formData.entries());
  const candidate = { ...entries, consent: entries.consent === "on" || entries.consent === "true" };
  const parsed = alumniRegisterSchema.safeParse(candidate);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let alumni;
  try {
    alumni = await registerAlumni(parsed.data);
  } catch (err) {
    if (err instanceof DuplicateAlumniEmailError) {
      return { fieldErrors: { email: [err.message] } };
    }
    console.error("[alumni-register]", err);
    return { error: "Something went wrong. Please try again." };
  }

  await createAlumniSession(alumni);
  redirect("/alumni/dashboard");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const unifiedLoginAction = withActionErrorHandling("unifiedLoginAction", unifiedLoginActionImpl);
export const unifiedLogoutAction = withVoidActionErrorHandling("unifiedLogoutAction", unifiedLogoutActionImpl);
export const adminLoginAction = withActionErrorHandling("adminLoginAction", adminLoginActionImpl);
export const adminLogoutAction = withVoidActionErrorHandling("adminLogoutAction", adminLogoutActionImpl);
export const memberLoginAction = withActionErrorHandling("memberLoginAction", memberLoginActionImpl);
export const memberLogoutAction = withVoidActionErrorHandling("memberLogoutAction", memberLogoutActionImpl);
export const alumniLoginAction = withActionErrorHandling("alumniLoginAction", alumniLoginActionImpl);
export const alumniLogoutAction = withVoidActionErrorHandling("alumniLogoutAction", alumniLogoutActionImpl);
export const alumniRegisterAction = withActionErrorHandling("alumniRegisterAction", alumniRegisterActionImpl);
