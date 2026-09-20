"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionErrorHandling } from "./with-error-handling";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { APPLICATION_TRACKS } from "@/lib/validations/membership";
import { addAcademicOption, removeAcademicOption } from "@/lib/services/academic-options-service";
import type { ActionState } from "./types";

const optionSchema = z.object({
  track: z.enum(APPLICATION_TRACKS),
  kind: z.enum(["departments", "programmes"]),
  label: z.string(),
});

const INCOMPLETE = "That request was incomplete. Please reload the page and try again.";

/** Everywhere these lists are offered or shown. */
function revalidateAcademicOptionViews() {
  revalidatePath("/admin/academic-options");
  revalidatePath("/membership/enroll/undergraduate");
  revalidatePath("/membership/enroll/postgraduate");
  revalidatePath("/alumni/further-studies");
  revalidatePath("/admin/users");
  revalidatePath("/admin/members/[id]", "page");
}

async function addAcademicOptionActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("members.academic");
  const parsed = optionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: INCOMPLETE };

  const result = await addAcademicOption({ ...parsed.data, adminId: admin.id });
  if (!result.ok) return { fieldErrors: { label: [result.error] } };

  revalidateAcademicOptionViews();
  return { success: true };
}

async function removeAcademicOptionActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireCapability("members.academic");
  const parsed = optionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: INCOMPLETE };

  const result = await removeAcademicOption({ ...parsed.data, adminId: admin.id });
  if (!result.ok) return { error: result.error };

  revalidateAcademicOptionViews();
  return { success: true };
}

export const addAcademicOptionAction = withActionErrorHandling("addAcademicOptionAction", addAcademicOptionActionImpl);
export const removeAcademicOptionAction = withActionErrorHandling(
  "removeAcademicOptionAction",
  removeAcademicOptionActionImpl,
);
