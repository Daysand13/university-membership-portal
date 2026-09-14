"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionErrorHandling } from "./with-error-handling";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { addSpecialNeedsCategory, removeSpecialNeedsCategory } from "@/lib/services/special-needs-category-service";
import type { ActionState } from "./types";

const categorySchema = z.object({ label: z.string() });

const INCOMPLETE = "That request was incomplete. Please reload the page and try again.";

/** Everywhere the list is offered or shown. */
function revalidateCategoryViews() {
  revalidatePath("/admin/special-needs-categories");
  revalidatePath("/membership/enroll/undergraduate");
  revalidatePath("/membership/enroll/postgraduate");
  revalidatePath("/alumni/further-studies");
  revalidatePath("/admin/users");
  revalidatePath("/admin/members/[id]", "page");
}

async function addSpecialNeedsCategoryActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: INCOMPLETE };

  const result = await addSpecialNeedsCategory({ label: parsed.data.label, adminId: admin.id });
  if (!result.ok) return { fieldErrors: { label: [result.error] } };

  revalidateCategoryViews();
  return { success: true };
}

async function removeSpecialNeedsCategoryActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: INCOMPLETE };

  const result = await removeSpecialNeedsCategory({ label: parsed.data.label, adminId: admin.id });
  if (!result.ok) return { error: result.error };

  revalidateCategoryViews();
  return { success: true };
}

export const addSpecialNeedsCategoryAction = withActionErrorHandling(
  "addSpecialNeedsCategoryAction",
  addSpecialNeedsCategoryActionImpl,
);
export const removeSpecialNeedsCategoryAction = withActionErrorHandling(
  "removeSpecialNeedsCategoryAction",
  removeSpecialNeedsCategoryActionImpl,
);
