"use server";

import { withActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import {
  pushToAlumniArchiveSchema,
  grantDualStatusSchema,
  newEnrollmentCycleSchema,
} from "@/lib/validations/membership";
import {
  pushToAlumniArchive,
  grantDualStatus,
  approveNewEnrollmentCycle,
  UserAdminError,
} from "@/lib/services/user-admin-service";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import type { ActionState } from "./types";

/**
 * Every one of these changes a real person's standing, so they all sit behind
 * the same membership-officer permission as the rest of member management,
 * and each writes an audit entry inside its own transaction (see
 * user-admin-service.ts).
 */

/** Pages that show someone's standing and would otherwise go stale. */
function revalidateStandingViews(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/members");
  revalidatePath("/admin/alumni");
  revalidatePath("/admin");
  revalidatePath("/alumni/directory");
}

async function pushToAlumniArchiveActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = pushToAlumniArchiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await pushToAlumniArchive({
      userId: parsed.data.userId,
      graduationYear: parsed.data.graduationYear,
      adminId: admin.id,
      inviteBaseUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/alumni/reset-password`,
    });
  } catch (err) {
    if (err instanceof UserAdminError) return { error: err.message };
    console.error("[push-to-alumni-archive]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateStandingViews(parsed.data.userId);
  return { success: true };
}

async function grantDualStatusActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = grantDualStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await grantDualStatus({
      userId: parsed.data.userId,
      role: parsed.data.role,
      graduationYear: parsed.data.graduationYear,
      adminId: admin.id,
    });
  } catch (err) {
    if (err instanceof UserAdminError) return { error: err.message };
    console.error("[grant-dual-status]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateStandingViews(parsed.data.userId);
  return { success: true };
}

async function approveNewEnrollmentCycleActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = newEnrollmentCycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await approveNewEnrollmentCycle({
      userId: parsed.data.userId,
      indexNumber: parsed.data.indexNumber,
      programme: parsed.data.programme,
      level: parsed.data.level,
      campus: parsed.data.campus,
      department: parsed.data.department,
      academicDepartment: parsed.data.academicDepartment || null,
      applicationTrack: parsed.data.applicationTrack || null,
      yearOfAdmission: parsed.data.yearOfAdmission,
      adminId: admin.id,
    });
  } catch (err) {
    if (err instanceof UserAdminError) return { error: err.message };
    console.error("[approve-new-enrollment-cycle]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateStandingViews(parsed.data.userId);
  return { success: true };
}

export const pushToAlumniArchiveAction = withActionErrorHandling(
  "pushToAlumniArchiveAction",
  pushToAlumniArchiveActionImpl,
);
export const grantDualStatusAction = withActionErrorHandling("grantDualStatusAction", grantDualStatusActionImpl);
export const approveNewEnrollmentCycleAction = withActionErrorHandling(
  "approveNewEnrollmentCycleAction",
  approveNewEnrollmentCycleActionImpl,
);
