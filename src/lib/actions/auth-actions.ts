"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validations/content";
import { memberLoginSchema } from "@/lib/validations/membership";
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
import { createAdminSession, destroyAdminSession } from "@/lib/auth/admin";
import { createMemberSession, destroyMemberSession } from "@/lib/auth/member";
import { createAlumniSession, createAlumniSessionNonPersistent, destroyAlumniSession } from "@/lib/auth/alumni";
import type { ActionState } from "./types";

export async function adminLoginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

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

export async function adminLogoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function memberLoginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

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

export async function memberLogoutAction(): Promise<void> {
  await destroyMemberSession();
  redirect("/");
}

export async function alumniLoginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alumniLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

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

export async function alumniLogoutAction(): Promise<void> {
  await destroyAlumniSession();
  redirect("/alumni");
}

export async function alumniRegisterAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
