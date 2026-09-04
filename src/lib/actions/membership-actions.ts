"use server";

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
import { ApplicationStatus, AdminRole } from "@/generated/prisma/client";
import { uploadBuffer, generateObjectKey, buildPublicUrl, isR2Configured } from "@/lib/storage/r2";
import { validateUploadRequest, sniffImageMimeType } from "@/lib/storage/validation";
import type { ActionState } from "./types";

// ---------------------------------------------------------------------------
// Public enrollment
// ---------------------------------------------------------------------------

export async function submitEnrollmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const entries = Object.fromEntries(formData.entries());
  const candidate = {
    ...entries,
    agreedToTerms: entries.agreedToTerms === "on" || entries.agreedToTerms === "true",
    specificSupportNeeds: formData.getAll("specificSupportNeeds"),
  };
  delete (candidate as Record<string, unknown>).profilePicture;
  delete (candidate as Record<string, unknown>).medicalReport;
  // medicalReportKey is validated as "present" via the schema but the real
  // value comes from the uploaded file below, not the form field itself.
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
  }

  let medicalReportUrl: string | null = null;
  if (medicalReportFile instanceof File && medicalReportFile.size > 0) {
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

export async function reviewApplicationAction(
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

export async function changeMemberPasswordAction(
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

export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const resetBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/membership/reset-password`;
  await requestPasswordReset(parsed.data.email, resetBaseUrl);

  // Same response whether or not the email exists — see service comment.
  return { success: true };
}

export async function resetPasswordAction(
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

export async function updateMemberProfileAction(
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

  await updateMemberProfile(member.id, {
    phone,
    residentialAddress,
    region,
    emergencyContactName,
    emergencyContactPhone,
  });

  revalidatePath("/membership/dashboard");
  return {};
}

// ---------------------------------------------------------------------------
// Admin: members
// ---------------------------------------------------------------------------

export async function setMemberStatusAction(memberId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { setMemberStatus } = await import("@/lib/services/membership-service");
  await setMemberStatus({ memberId, adminId: admin.id, status });
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
}

export async function deleteMemberAction(memberId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.SUPER_ADMIN);
  await deleteMember({ memberId, adminId: admin.id });
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function deleteApplicationAction(applicationId: string): Promise<void> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  await deleteApplication({ applicationId, adminId: admin.id });
  revalidatePath("/admin/membership-applications");
  redirect("/admin/membership-applications");
}
