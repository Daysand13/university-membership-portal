"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { AdminPermissionError, updateAdminPermissions } from "@/lib/services/admin-permission-service";
import {
  AdminAccountError,
  createAdminAccount,
  InvalidAdminInviteError,
  resendAdminInvite,
  setAdminActive,
  setAdminPasswordWithToken,
} from "@/lib/services/admin-account-service";
import { DuplicateAdminEmailError } from "@/lib/services/admin-auth-service";
import { getExecutiveAccess } from "@/lib/services/executive-access-service";
import { adminAccountSchema, adminSetPasswordSchema } from "@/lib/validations/admin-account";
import { withActionErrorHandling, withTypedActionErrorHandling } from "./with-error-handling";
import type { ActionState } from "./types";

const ROLE_VALUES = Object.values(AdminRole) as string[];

async function saveAdminPermissionsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireCapability("site.permissions");

  const adminId = String(formData.get("adminId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!adminId) return { error: "Choose an administrator first." };
  if (!ROLE_VALUES.includes(role)) return { fieldErrors: { role: ["Choose a base role."] } };

  // Every capability the grid ticked; anything absent is withheld.
  const granted = formData.getAll("capability").map(String);

  try {
    const updated = await updateAdminPermissions({
      adminId,
      role: role as AdminRole,
      granted,
      actor: { id: actor.id, role: actor.role },
    });
    revalidatePath("/admin/permissions");
    // Their sidebar and every page they can reach follow from this.
    revalidatePath("/admin", "layout");
    return {
      success: true,
      message: `${updated.name}'s permissions have been saved. They take effect the next time they load a page.`,
    };
  } catch (err) {
    if (err instanceof AdminPermissionError) return { error: err.message };
    throw err;
  }
}

export const saveAdminPermissionsAction = withActionErrorHandling(
  "saveAdminPermissionsAction",
  saveAdminPermissionsActionImpl,
);

// ---------------------------------------------------------------------------
// Administrator accounts themselves
// ---------------------------------------------------------------------------

const INVITE_BASE_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/set-password`;

async function createAdminAccountActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireCapability("site.permissions");
  const parsed = adminAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const { admin, invitationEmailed } = await createAdminAccount({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role as AdminRole,
      actorId: actor.id,
      inviteBaseUrl: INVITE_BASE_URL,
    });
    revalidatePath("/admin/permissions");
    return {
      success: true,
      message: invitationEmailed
        ? `${admin.name}'s account has been created, and an invitation to choose a password has been emailed to ${admin.email}.`
        : `${admin.name}'s account has been created, but the invitation email could not be sent to ${admin.email}. Use "Send the invitation again" once email is working.`,
    };
  } catch (err) {
    if (err instanceof DuplicateAdminEmailError || err instanceof AdminAccountError) return { error: err.message };
    throw err;
  }
}

async function resendAdminInviteActionImpl(adminId: string): Promise<string> {
  const actor = await requireCapability("site.permissions");
  const admin = await resendAdminInvite({ adminId, actorId: actor.id, inviteBaseUrl: INVITE_BASE_URL });
  revalidatePath("/admin/permissions");
  return admin.invitationEmailed
    ? `A new link has been emailed to ${admin.email}. It works for 14 days, and any earlier link has stopped working.`
    : `The email to ${admin.email} could not be sent. Any earlier link has stopped working, so try again once email is back.`;
}

async function setAdminActiveActionImpl(adminId: string, isActive: boolean): Promise<string> {
  const actor = await requireCapability("site.permissions");
  const updated = await setAdminActive({ adminId, isActive, actorId: actor.id });
  revalidatePath("/admin/permissions");
  return isActive
    ? `${updated.name} can sign in again.`
    : `${updated.name} can no longer sign in. Everything they did stays on record.`;
}

/** The invited administrator's own page — no session yet, the link is the proof. */
async function setAdminPasswordActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = adminSetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await setAdminPasswordWithToken(parsed.data.token, parsed.data.newPassword);
  } catch (err) {
    if (err instanceof InvalidAdminInviteError) return { error: err.message };
    throw err;
  }
  return { success: true, message: "Your password is set. You can sign in now." };
}

export const createAdminAccountAction = withActionErrorHandling("createAdminAccountAction", createAdminAccountActionImpl);
export const resendAdminInviteAction = withTypedActionErrorHandling("resendAdminInviteAction", resendAdminInviteActionImpl);
export const setAdminActiveAction = withTypedActionErrorHandling("setAdminActiveAction", setAdminActiveActionImpl);
export const setAdminPasswordAction = withActionErrorHandling("setAdminPasswordAction", setAdminPasswordActionImpl);

/**
 * Giving an executive portal access from their own leadership listing —
 * the place the rest of their profile is edited.
 *
 * Their name comes from the listing and their address from the member
 * account it is linked to, so there is nothing to retype and no chance of
 * creating an account for a slightly different person.
 */
async function createExecutiveAccountActionImpl(
  teamMemberId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCapability("site.permissions");

  const access = await getExecutiveAccess(teamMemberId);
  if (!access) return { error: "That leadership listing no longer exists." };
  if (access.admin) return { error: `${access.admin.name} already has an administrator account.` };

  const parsed = adminAccountSchema.safeParse({
    name: access.listing.name,
    email: String(formData.get("email") ?? access.member?.email ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const { admin, invitationEmailed } = await createAdminAccount({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role as AdminRole,
      actorId: actor.id,
      inviteBaseUrl: INVITE_BASE_URL,
      userId: access.member?.userId ?? null,
    });
    revalidatePath(`/admin/team/${teamMemberId}`);
    revalidatePath("/admin/team");
    return {
      success: true,
      message: invitationEmailed
        ? `${admin.name} can now be given privileges below. An invitation to choose a password has been emailed to ${admin.email}.`
        : `${admin.name}'s account was created, but the invitation email to ${admin.email} could not be sent. Send it again once email is working.`,
    };
  } catch (err) {
    if (err instanceof DuplicateAdminEmailError || err instanceof AdminAccountError) return { error: err.message };
    throw err;
  }
}

export const createExecutiveAccountAction = withActionErrorHandling(
  "createExecutiveAccountAction",
  createExecutiveAccountActionImpl,
);
