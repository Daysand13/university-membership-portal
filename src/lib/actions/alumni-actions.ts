"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  alumniForgotPasswordSchema,
  alumniSetPasswordSchema,
  alumniChangePasswordSchema,
  alumniProfileUpdateSchema,
} from "@/lib/validations/alumni";
import {
  requestAlumniPasswordReset,
  setAlumniPasswordWithToken,
  changeAlumniPassword,
  updateAlumniProfile,
  promoteMemberToAlumni,
  setAlumniStatus,
  deleteAlumni,
  InvalidOrExpiredAlumniTokenError,
  InvalidAlumniCredentialsError,
  DuplicateAlumniEmailError,
} from "@/lib/services/alumni-service";
import { requireAlumni } from "@/lib/auth/alumni";
import { requireAdminRole } from "@/lib/auth/admin";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AdminRole, AlumniStatus } from "@/generated/prisma/client";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

async function alumniForgotPasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alumniForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`alumni-forgot-password:ip:${ip}`, { max: 10, windowSeconds: 600 }),
    checkRateLimit(`alumni-forgot-password:email:${parsed.data.email}`, { max: 3, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const resetBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/alumni/reset-password`;
  try {
    await requestAlumniPasswordReset(parsed.data.email, resetBaseUrl);
  } catch (err) {
    console.error("[alumni-forgot-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  // Same response whether or not the email exists — see service comment.
  return { success: true };
}

async function alumniSetPasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alumniSetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await setAlumniPasswordWithToken(parsed.data.token, parsed.data.newPassword);
  } catch (err) {
    if (err instanceof InvalidOrExpiredAlumniTokenError) return { error: err.message };
    console.error("[alumni-set-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/alumni?next=login&passwordSet=1");
}

async function alumniChangePasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const parsed = alumniChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changeAlumniPassword({
      alumniId: alumni.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (err) {
    if (err instanceof InvalidAlumniCredentialsError) {
      return { fieldErrors: { currentPassword: [err.message] } };
    }
    console.error("[alumni-change-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/alumni/dashboard?passwordChanged=1");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

async function updateAlumniProfileActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();
  const entries = Object.fromEntries(formData.entries());
  const candidate = {
    ...entries,
    willingToMentor: entries.willingToMentor === "on" || entries.willingToMentor === "true",
    directoryVisible: entries.directoryVisible === "on" || entries.directoryVisible === "true",
  };
  const parsed = alumniProfileUpdateSchema.safeParse(candidate);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await updateAlumniProfile(alumni.id, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      profession: parsed.data.profession || null,
      currentLocation: parsed.data.currentLocation || null,
      bio: parsed.data.bio || null,
      willingToMentor: parsed.data.willingToMentor,
      directoryVisible: parsed.data.directoryVisible,
    });
  } catch (err) {
    console.error("[update-alumni-profile]", err);
    return { error: "Something went wrong saving your changes. Please try again." };
  }

  revalidatePath("/alumni/dashboard");
  revalidatePath("/alumni/profile");
  revalidatePath("/alumni/directory");
  revalidatePath("/alumni/mentorship");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function promoteMemberToAlumniActionImpl(
  memberId: string,
  graduationYear: number,
): Promise<{ error?: string }> {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const inviteBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/alumni/reset-password`;

  try {
    await promoteMemberToAlumni({ memberId, graduationYear, inviteBaseUrl });
  } catch (err) {
    if (err instanceof DuplicateAlumniEmailError) return { error: err.message };
    console.error("[promote-member-to-alumni]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/alumni");
  return {};
}

async function setAlumniStatusActionImpl(alumniId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await setAlumniStatus({ alumniId, status: status as AlumniStatus });
  revalidatePath("/admin/alumni");
}

async function deleteAlumniActionImpl(alumniId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.SUPER_ADMIN);
  await deleteAlumni({ alumniId, adminId: admin.id });
  revalidatePath("/admin/alumni");
  redirect("/admin/alumni");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const alumniForgotPasswordAction = withActionErrorHandling("alumniForgotPasswordAction", alumniForgotPasswordActionImpl);
export const alumniSetPasswordAction = withActionErrorHandling("alumniSetPasswordAction", alumniSetPasswordActionImpl);
export const alumniChangePasswordAction = withActionErrorHandling("alumniChangePasswordAction", alumniChangePasswordActionImpl);
export const updateAlumniProfileAction = withActionErrorHandling("updateAlumniProfileAction", updateAlumniProfileActionImpl);
export const promoteMemberToAlumniAction = withActionErrorHandling("promoteMemberToAlumniAction", promoteMemberToAlumniActionImpl);
export const setAlumniStatusAction = withVoidActionErrorHandling("setAlumniStatusAction", setAlumniStatusActionImpl);
export const deleteAlumniAction = withVoidActionErrorHandling("deleteAlumniAction", deleteAlumniActionImpl);
