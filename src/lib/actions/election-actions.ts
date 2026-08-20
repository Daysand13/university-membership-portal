"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole, requireAdminUser } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { electionSchema, adminChangeEmailSchema, adminUpdateNameSchema } from "@/lib/validations/content";
import { changePasswordSchema } from "@/lib/validations/membership";
import { createElection, updateElection, deleteElection } from "@/lib/services/election-service";
import {
  changeAdminPassword,
  changeAdminEmail,
  updateAdminName,
  DuplicateAdminEmailError,
} from "@/lib/services/admin-auth-service";
import { InvalidCredentialsError } from "@/lib/services/membership-service";
import type { ActionState } from "./types";

function parseElectionForm(formData: FormData) {
  return electionSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status") ?? "DRAFT",
    nominationStart: formData.get("nominationStart") || undefined,
    nominationEnd: formData.get("nominationEnd") || undefined,
    votingDate: formData.get("votingDate") || undefined,
    venueOrMethod: formData.get("venueOrMethod") || undefined,
    resultsSummary: formData.get("resultsSummary") || undefined,
  });
}

export async function createElectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.ELECTION_OFFICER);
  const parsed = parseElectionForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const election = await createElection(parsed.data, admin.id);
  revalidatePath("/elections");
  revalidatePath("/admin/elections");
  redirect(`/admin/elections/${election.id}`);
}

export async function updateElectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.ELECTION_OFFICER);
  const parsed = parseElectionForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = parsed.data.id;
  if (!id) return { error: "Missing election id." };

  await updateElection(id, parsed.data);
  revalidatePath("/elections");
  revalidatePath("/admin/elections");
  return {};
}

export async function deleteElectionAction(id: string): Promise<void> {
  await requireAdminRole(AdminRole.ELECTION_OFFICER);
  await deleteElection(id);
  revalidatePath("/elections");
  revalidatePath("/admin/elections");
}

export async function changeAdminPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changeAdminPassword({
      adminId: admin.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { fieldErrors: { currentPassword: [err.message] } };
    }
    console.error("[admin-change-password]", err);
    return { error: "Something went wrong. Please try again." };
  }

  return {};
}

export async function changeAdminEmailAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminUser();
  const parsed = adminChangeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changeAdminEmail({
      adminId: admin.id,
      currentPassword: parsed.data.currentPassword,
      newEmail: parsed.data.newEmail,
    });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { fieldErrors: { currentPassword: [err.message] } };
    }
    if (err instanceof DuplicateAdminEmailError) {
      return { fieldErrors: { newEmail: [err.message] } };
    }
    console.error("[admin-change-email]", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin", "layout");
  return {};
}

export async function updateAdminNameAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminUser();
  const parsed = adminUpdateNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await updateAdminName({ adminId: admin.id, name: parsed.data.name });
  revalidatePath("/admin", "layout");
  return {};
}
