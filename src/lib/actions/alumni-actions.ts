"use server";

import { withActionErrorHandling, withVoidActionErrorHandling, withTypedActionErrorHandling } from "./with-error-handling";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  alumniForgotPasswordSchema,
  alumniSetPasswordSchema,
  alumniChangePasswordSchema,
  alumniProfileUpdateSchema,
} from "@/lib/validations/alumni";
import { alumniFurtherStudiesSchema } from "@/lib/validations/membership";
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
import {
  submitFurtherStudiesApplication,
  DuplicateIndexNumberError,
  DuplicateEmailError,
} from "@/lib/services/membership-service";
import {
  requestEnrollmentUpload,
  adoptEnrollmentUpload,
  EnrollmentUploadError,
  type EnrollmentUploadKind,
  type EnrollmentUploadTicket,
} from "@/lib/services/enrollment-upload-service";
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

  redirect("/alumni/login?passwordSet=1");
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
// Further studies — an alumnus becoming a current member again
// ---------------------------------------------------------------------------

/**
 * Signed upload ticket for the further-studies form, mirroring
 * requestEnrollmentUploadAction but for a signed-in alumnus instead of an
 * anonymous applicant — see enrollment-upload-service.ts for what the
 * ticket actually guarantees. Authentication (requireAlumni) does the job
 * the public form's IP rate limit exists to approximate, so this is
 * rate-limited by account rather than by address.
 */
async function requestFurtherStudiesUploadActionImpl(input: {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<EnrollmentUploadTicket> {
  const alumni = await requireAlumni();
  const limit = await checkRateLimit(`further-studies-upload:alumni:${alumni.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  return requestEnrollmentUpload(input);
}

async function submitFurtherStudiesActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alumni = await requireAlumni();

  const limit = await checkRateLimit(`further-studies-submit:alumni:${alumni.id}`, { max: 5, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const entries = Object.fromEntries(formData.entries());
  // A previously-graduated member (or an alumnus who already did this once
  // before) was already physically verified at the Resource Center — this
  // form doesn't ask them to prove that again. Someone who only ever
  // self-registered as alumni has never been verified at all, so their
  // attachments are required exactly as they would be on the ordinary
  // enrollment form.
  const attachmentsRequired = !alumni.sourceMemberId;
  const passportToken = typeof entries.profilePictureToken === "string" ? entries.profilePictureToken : "";
  const medicalToken = typeof entries.medicalReportToken === "string" ? entries.medicalReportToken : "";

  const candidate = {
    ...entries,
    // A checkbox's raw FormData value is the string "on" when checked, and
    // the key is absent entirely when unchecked — never an actual boolean.
    // Without this conversion, z.literal(true) rejects "on" and this field
    // fails validation even when the person genuinely checked the box.
    agreedToTerms: entries.agreedToTerms === "on" || entries.agreedToTerms === "true",
    specificSupportNeeds: formData.getAll("specificSupportNeeds"),
  };
  delete (candidate as Record<string, unknown>).profilePictureToken;
  delete (candidate as Record<string, unknown>).medicalReportToken;

  const parsed = alumniFurtherStudiesSchema.safeParse(candidate);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (attachmentsRequired && !passportToken) {
    return { fieldErrors: { profilePicture: ["Please attach a passport picture."] } };
  }
  if (attachmentsRequired && !medicalToken) {
    return { fieldErrors: { medicalReportKey: ["Please attach your medical report / disability assessment."] } };
  }

  let profileImageUrl: string | null = null;
  let medicalReportUrl: string | null = null;

  try {
    profileImageUrl = await adoptEnrollmentUpload("passport", passportToken);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { fieldErrors: { profilePicture: [err.message] } };
    throw err;
  }
  try {
    medicalReportUrl = await adoptEnrollmentUpload("medical", medicalToken);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) return { fieldErrors: { medicalReportKey: [err.message] } };
    throw err;
  }

  try {
    await submitFurtherStudiesApplication(alumni, parsed.data, profileImageUrl, medicalReportUrl);
  } catch (err) {
    if (err instanceof DuplicateIndexNumberError) {
      return { fieldErrors: { indexNumber: [err.message] } };
    }
    if (err instanceof DuplicateEmailError) {
      return { error: err.message };
    }
    console.error("[submit-further-studies]", err);
    return { error: "Something went wrong submitting this. Please try again." };
  }

  revalidatePath("/alumni/dashboard");
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
export const requestFurtherStudiesUploadAction = withTypedActionErrorHandling("requestFurtherStudiesUploadAction", requestFurtherStudiesUploadActionImpl);
export const submitFurtherStudiesAction = withActionErrorHandling("submitFurtherStudiesAction", submitFurtherStudiesActionImpl);
export const promoteMemberToAlumniAction = withActionErrorHandling("promoteMemberToAlumniAction", promoteMemberToAlumniActionImpl);
export const setAlumniStatusAction = withVoidActionErrorHandling("setAlumniStatusAction", setAlumniStatusActionImpl);
export const deleteAlumniAction = withVoidActionErrorHandling("deleteAlumniAction", deleteAlumniActionImpl);
