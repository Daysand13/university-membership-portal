"use server";

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
import { AdminRole, AlumniStatus } from "@/generated/prisma/client";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

export async function alumniForgotPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alumniForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const resetBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/alumni/reset-password`;
  await requestAlumniPasswordReset(parsed.data.email, resetBaseUrl);

  // Same response whether or not the email exists — see service comment.
  return { success: true };
}

export async function alumniSetPasswordAction(
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

export async function alumniChangePasswordAction(
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

export async function updateAlumniProfileAction(
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

  await updateAlumniProfile(alumni.id, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    profession: parsed.data.profession || null,
    currentLocation: parsed.data.currentLocation || null,
    bio: parsed.data.bio || null,
    willingToMentor: parsed.data.willingToMentor,
    directoryVisible: parsed.data.directoryVisible,
  });

  revalidatePath("/alumni/dashboard");
  revalidatePath("/alumni/profile");
  revalidatePath("/alumni/directory");
  revalidatePath("/alumni/mentorship");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function promoteMemberToAlumniAction(
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

export async function setAlumniStatusAction(alumniId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await setAlumniStatus({ alumniId, status: status as AlumniStatus });
  revalidatePath("/admin/alumni");
}

export async function deleteAlumniAction(alumniId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.SUPER_ADMIN);
  await deleteAlumni({ alumniId, adminId: admin.id });
  revalidatePath("/admin/alumni");
  redirect("/admin/alumni");
}
