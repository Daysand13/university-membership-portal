"use server";

import { withActionErrorHandling, withVoidActionErrorHandling, withTypedActionErrorHandling } from "./with-error-handling";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { enrollmentSchema, applicationReviewSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, memberAdminEditSchema } from "@/lib/validations/membership";
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
  updateMemberAdmin,
  deleteMember,
  deleteApplication,
  DuplicateIndexNumberError,
  DuplicateEmailError,
  ApplicationAlreadyApprovedError,
  InvalidCredentialsError,
  InvalidOrExpiredTokenError,
} from "@/lib/services/membership-service";
import { requireAdminRole } from "@/lib/auth/admin";
import { requireMember } from "@/lib/auth/member";
import { isLikelyBot } from "@/lib/bot-protection";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { ApplicationStatus, AdminRole } from "@/generated/prisma/client";
import { isR2Configured } from "@/lib/storage/r2";
import { domainCanReceiveMail } from "@/lib/email-domain-check";
import {
  requestEnrollmentUpload,
  adoptEnrollmentUpload,
  EnrollmentUploadError,
  type EnrollmentUploadKind,
  type EnrollmentUploadTicket,
} from "@/lib/services/enrollment-upload-service";
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
  // File bytes no longer travel with this request. The browser uploaded them
  // straight to R2; what arrives here is a signed ticket naming the object.
  // That's what keeps this request far below Vercel's 4.5MB body cap, which
  // used to reject oversized submissions before this function ever ran.
  const passportToken = typeof entries.profilePictureToken === "string" ? entries.profilePictureToken : "";
  const medicalToken = typeof entries.medicalReportToken === "string" ? entries.medicalReportToken : "";

  const candidate = {
    ...entries,
    agreedToTerms: entries.agreedToTerms === "on" || entries.agreedToTerms === "true",
    specificSupportNeeds: formData.getAll("specificSupportNeeds"),
  };
  delete (candidate as Record<string, unknown>).profilePictureToken;
  delete (candidate as Record<string, unknown>).medicalReportToken;
  // medicalReportKey exists so the schema can enforce "a medical report was
  // attached"; the real value is resolved from the ticket below. Where R2
  // isn't configured at all (local development) uploads are skipped entirely,
  // so requiring a ticket there would make the form impossible to submit.
  (candidate as Record<string, unknown>).medicalReportKey =
    medicalToken || !isR2Configured() ? "pending" : "";

  const parsed = enrollmentSchema.safeParse(candidate);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Catches the exact mistake that locked a real member out of email-only
  // login elsewhere in this system (gmail.cim instead of gmail.com) — a
  // domain that can't receive mail at all, before an application is ever
  // saved under it. See email-domain-check.ts for what this can and can't
  // actually confirm.
  if (!(await domainCanReceiveMail(parsed.data.email))) {
    return {
      fieldErrors: {
        email: [
          "We couldn't find a mail server for this email address — please check for a typo (for example, .com instead of .cim) and try again.",
        ],
      },
    };
  }

  // Verify each upload against what was actually authorised: the object has
  // to exist, be within its size limit, and carry magic bytes matching the
  // Content-Type pinned into its presigned URL. Anything that doesn't match
  // is deleted rather than saved — see enrollment-upload-service.ts for why
  // that check is what replaces "the bytes passed through our server".
  let profileImageUrl: string | null = null;
  let medicalReportUrl: string | null = null;

  try {
    profileImageUrl = await adoptEnrollmentUpload("passport", passportToken);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) {
      return { fieldErrors: { profilePicture: [err.message] } };
    }
    throw err;
  }

  try {
    medicalReportUrl = await adoptEnrollmentUpload("medical", medicalToken);
  } catch (err) {
    if (err instanceof EnrollmentUploadError) {
      return { fieldErrors: { medicalReportKey: [err.message] } };
    }
    throw err;
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

/**
 * Issues a short-lived, signed ticket the enrollment form uses to upload a
 * file straight to R2. Deliberately unauthenticated — the people using it
 * haven't got accounts yet — so the rate limit below is what stops it being
 * treated as free file hosting, alongside the size/type checks and the
 * post-upload verification done at submission time.
 */
async function requestEnrollmentUploadActionImpl(input: {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<EnrollmentUploadTicket> {
  const ip = await getClientIp();
  // Two files per application plus room to change your mind, on a network
  // where a whole campus can share one address.
  const limit = await checkRateLimit(`enroll-upload:ip:${ip}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  return requestEnrollmentUpload(input);
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
    if (
      err instanceof DuplicateEmailError ||
      err instanceof DuplicateIndexNumberError ||
      err instanceof ApplicationAlreadyApprovedError
    ) {
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

async function updateMemberAdminActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { error: "Missing member." };

  const entries = Object.fromEntries(formData.entries());
  const candidate = {
    ...entries,
    specificSupportNeeds: formData.getAll("specificSupportNeeds"),
  };
  const parsed = memberAdminEditSchema.safeParse(candidate);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateMemberAdmin({ memberId, adminId: admin.id, updates: parsed.data });
  } catch (err) {
    if (err instanceof DuplicateIndexNumberError) {
      return { fieldErrors: { indexNumber: [err.message] } };
    }
    if (err instanceof DuplicateEmailError) {
      return { fieldErrors: { email: [err.message] } };
    }
    console.error("[update-member-admin]", err);
    return { error: "Something went wrong saving these changes. Please try again." };
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  // A graduated member's edits also land on their AlumniProfile (see
  // updateMemberAdmin) — harmless to revalidate these even when the member
  // isn't graduated, since an unaffected page just re-renders with the same
  // data.
  revalidatePath("/admin/alumni");
  revalidatePath("/alumni/directory");
  return { success: true };
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
export const requestEnrollmentUploadAction = withTypedActionErrorHandling("requestEnrollmentUploadAction", requestEnrollmentUploadActionImpl);
export const reviewApplicationAction = withActionErrorHandling("reviewApplicationAction", reviewApplicationActionImpl);
export const changeMemberPasswordAction = withActionErrorHandling("changeMemberPasswordAction", changeMemberPasswordActionImpl);
export const forgotPasswordAction = withActionErrorHandling("forgotPasswordAction", forgotPasswordActionImpl);
export const resetPasswordAction = withActionErrorHandling("resetPasswordAction", resetPasswordActionImpl);
export const updateMemberProfileAction = withActionErrorHandling("updateMemberProfileAction", updateMemberProfileActionImpl);
export const updateMemberAdminAction = withActionErrorHandling("updateMemberAdminAction", updateMemberAdminActionImpl);
export const deleteMemberAction = withVoidActionErrorHandling("deleteMemberAction", deleteMemberActionImpl);
export const deleteApplicationAction = withVoidActionErrorHandling("deleteApplicationAction", deleteApplicationActionImpl);
export const setMemberStatusAction = withVoidActionErrorHandling("setMemberStatusAction", setMemberStatusActionImpl);
