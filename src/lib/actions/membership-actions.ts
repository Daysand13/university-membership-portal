"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { enrollmentSchema, applicationReviewSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, MAX_PASSPORT_PICTURE_BYTES, MAX_MEDICAL_REPORT_BYTES } from "@/lib/validations/membership";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  requestApplicationChanges,
  setApplicationStatus,
  changeMemberPassword,
  requestPasswordReset,
  resetPasswordWithToken,
  updateMemberProfile,
  deleteMember,
  deleteApplication,
  DuplicateIndexNumberError,
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
} from "@/lib/services/membership-service";
import { requireAdminRole } from "@/lib/auth/admin";
import { requireMember } from "@/lib/auth/member";
import { isLikelyBot } from "@/lib/bot-protection";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { ApplicationStatus, AdminRole } from "@/generated/prisma/client";
import { uploadBuffer, generateObjectKey, buildPublicUrl, isR2Configured } from "@/lib/storage/r2";
import { validateUploadRequest, sniffImageMimeType } from "@/lib/storage/validation";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Public enrollment
// ---------------------------------------------------------------------------

async function submitEnrollmentActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Silently redirect as if this succeeded for anything that looks
  // automated — no error, no hint to a script that it was caught, and
  // nothing gets saved or uploaded.
  if (isLikelyBot(formData)) {
    redirect("/membership/enroll/success");
  }

  const ip = await getClientIp();
  // Set generously — a campus network can have many different students
  // submitting from the same shared IP during a busy registration period,
  // and this only needs to stop scripted spam, not a realistic burst of
  // real people.
  const limit = await checkRateLimit(`enroll:ip:${ip}`, { max: 30, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const entries = Object.fromEntries(formData.entries());
  const candidate = {
    ...entries,
    agreedToTerms: entries.agreedToTerms === "on" || entries.agreedToTerms === "true",
    specificSupportNeeds: formData.getAll("specificSupportNeeds"),
  };
  delete (candidate as Record<string, unknown>).profilePicture;
  delete (candidate as Record<string, unknown>).medicalReport;
  // medicalReportKey is validated as "present" via the schema, but the real
  // value comes from the uploaded file below rather than the form field.
  const medicalReportFile = formData.get("medicalReport");
  (candidate as Record<string, unknown>).medicalReportKey =
    medicalReportFile instanceof File && medicalReportFile.size > 0 ? "pending" : "";

  const parsed = enrollmentSchema.safeParse(candidate);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let profileImageUrl: string | null = null;
  const file = formData.get("profilePicture");
  if (file instanceof File && file.size > 0) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Unauthenticated endpoint — never trust the browser-reported MIME type
      // alone; sniff the actual bytes before accepting the file.
      const sniffed = sniffImageMimeType(new Uint8Array(buffer));
      const mimeType = sniffed ?? file.type;
      const check = validateUploadRequest({
        filename: file.name,
        mimeType,
        fileSize: file.size,
        category: "image",
        maxSizeBytes: MAX_PASSPORT_PICTURE_BYTES,
      });
      if (!check.ok) {
        return { fieldErrors: { profilePicture: [check.error] } };
      }
      if (isR2Configured()) {
        const objectKey = generateObjectKey("members", file.name, mimeType);
        await uploadBuffer({ objectKey, contentType: mimeType, body: buffer });
        profileImageUrl = buildPublicUrl(objectKey);
      } else {
        console.warn("[enroll] R2 not configured in this environment — profile picture not stored.");
      }
    } catch (err) {
      console.error("[enroll] passport picture upload failed", err);
      return { fieldErrors: { profilePicture: ["Something went wrong uploading this file. Please try again."] } };
    }
  }

  let medicalReportUrl: string | null = null;
  if (medicalReportFile instanceof File && medicalReportFile.size > 0) {
    try {
      const buffer = Buffer.from(await medicalReportFile.arrayBuffer());
      const sniffed = sniffImageMimeType(new Uint8Array(buffer));
      const mimeType = sniffed ?? medicalReportFile.type;
      const check = validateUploadRequest({
        filename: medicalReportFile.name,
        mimeType,
        fileSize: medicalReportFile.size,
        category: "document",
        maxSizeBytes: MAX_MEDICAL_REPORT_BYTES,
      });
      if (!check.ok) {
        return { fieldErrors: { medicalReportKey: [check.error] } };
      }
      if (isR2Configured()) {
        const objectKey = generateObjectKey("members", medicalReportFile.name, mimeType);
        await uploadBuffer({ objectKey, contentType: mimeType, body: buffer });
        medicalReportUrl = buildPublicUrl(objectKey);
      } else {
        console.warn("[enroll] R2 not configured in this environment — medical report not stored.");
      }
    } catch (err) {
      console.error("[enroll] medical report upload failed", err);
      return { fieldErrors: { medicalReportKey: ["Something went wrong uploading this file. Please try again."] } };
    }
  }

  try {
    await submitApplication(parsed.data, profileImageUrl, medicalReportUrl);
  } catch (err) {
    if (err instanceof DuplicateIndexNumberError) {
      return { fieldErrors: { indexNumber: [err.message] } };
    }
    console.error("[enroll]", err);
    return { error: "We couldn't submit your application. Please try again in a moment." };
  }

  redirect("/membership/enroll/success");
}

// ---------------------------------------------------------------------------
// Admin: application review
// ---------------------------------------------------------------------------

async function reviewApplicationActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = applicationReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "That request was malformed — please try again." };
  const { applicationId, action, adminNote } = parsed.data;

  if (action === "REQUEST_CHANGES" && !adminNote) {
    return { fieldErrors: { adminNote: ["Add a note explaining what needs to change."] } };
  }

  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/membership/login`;
    switch (action) {
      case "APPROVE":
        await approveApplication({ applicationId, adminId: admin.id, note: adminNote || undefined, loginUrl });
        break;
      case "REJECT":
        await rejectApplication({ applicationId, adminId: admin.id, note: adminNote || undefined });
        break;
      case "REQUEST_CHANGES":
        await requestApplicationChanges({ applicationId, adminId: admin.id, note: adminNote! });
        break;
      case "UNDER_REVIEW":
        await setApplicationStatus({
          applicationId,
          adminId: admin.id,
          status: ApplicationStatus.UNDER_REVIEW,
          note: adminNote || undefined,
        });
        break;
      case "SUSPEND":
        await setApplicationStatus({
          applicationId,
          adminId: admin.id,
          status: ApplicationStatus.SUSPENDED,
          note: adminNote || undefined,
        });
        break;
    }
  } catch (err) {
    if (err instanceof DuplicateEmailError || err instanceof DuplicateIndexNumberError) {
      return { error: err.message };
    }
    console.error("[review-application]", err);
    return { error: "Something went wrong processing this application." };
  }

  revalidatePath("/admin/membership-applications");
  revalidatePath(`/admin/membership-applications/${applicationId}`);
  revalidatePath("/admin");
  return {};
}

// ---------------------------------------------------------------------------
// Member: password lifecycle
// ---------------------------------------------------------------------------

async function changeMemberPasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changeMemberPassword({
      memberId: member.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { fieldErrors: { currentPassword: [err.message] } };
    }
    console.error("[change-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/membership/dashboard");
  redirect("/membership/dashboard?passwordChanged=1");
}

async function forgotPasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`forgot-password:ip:${ip}`, { max: 10, windowSeconds: 600 }),
    // Keyed on the submitted email specifically, so someone can't be
    // repeatedly email-bombed with reset links from different IPs.
    checkRateLimit(`forgot-password:email:${parsed.data.email}`, { max: 3, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const resetBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/membership/reset-password`;
  try {
    await requestPasswordReset(parsed.data.email, resetBaseUrl);
  } catch (err) {
    console.error("[forgot-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  // Same response whether or not the email exists — see service comment.
  return { success: true };
}

async function resetPasswordActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
  } catch (err) {
    if (err instanceof InvalidOrExpiredTokenError) return { error: err.message };
    console.error("[reset-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/membership/login?reset=1");
}

async function updateMemberProfileActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const phone = String(formData.get("phone") ?? "").trim();
  const residentialAddress = String(formData.get("residentialAddress") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();

  if (!phone) return { fieldErrors: { phone: ["Phone number is required"] } };

  try {
    await updateMemberProfile(member.id, {
      phone,
      residentialAddress,
      region,
      emergencyContactName,
      emergencyContactPhone,
    });
  } catch (err) {
    console.error("[update-member-profile]", err);
    return { error: "Something went wrong saving your changes. Please try again." };
  }

  revalidatePath("/membership/dashboard");
  return {};
}

// ---------------------------------------------------------------------------
// Admin: members
// ---------------------------------------------------------------------------

async function setMemberStatusActionImpl(memberId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { setMemberStatus } = await import("@/lib/services/membership-service");
  await setMemberStatus({ memberId, adminId: admin.id, status });
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
}

async function deleteMemberActionImpl(memberId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.SUPER_ADMIN);
  await deleteMember({ memberId, adminId: admin.id });
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

async function deleteApplicationActionImpl(applicationId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await deleteApplication({ applicationId, adminId: admin.id });
  revalidatePath("/admin/membership-applications");
  redirect("/admin/membership-applications");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const submitEnrollmentAction = withActionErrorHandling("submitEnrollmentAction", submitEnrollmentActionImpl);
export const reviewApplicationAction = withActionErrorHandling("reviewApplicationAction", reviewApplicationActionImpl);
export const changeMemberPasswordAction = withActionErrorHandling("changeMemberPasswordAction", changeMemberPasswordActionImpl);
export const forgotPasswordAction = withActionErrorHandling("forgotPasswordAction", forgotPasswordActionImpl);
export const resetPasswordAction = withActionErrorHandling("resetPasswordAction", resetPasswordActionImpl);
export const updateMemberProfileAction = withActionErrorHandling("updateMemberProfileAction", updateMemberProfileActionImpl);
export const deleteMemberAction = withVoidActionErrorHandling("deleteMemberAction", deleteMemberActionImpl);
export const deleteApplicationAction = withVoidActionErrorHandling("deleteApplicationAction", deleteApplicationActionImpl);
export const setMemberStatusAction = withVoidActionErrorHandling("setMemberStatusAction", setMemberStatusActionImpl);
