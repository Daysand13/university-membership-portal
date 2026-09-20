"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { AdminPermissionError, updateAdminPermissions } from "@/lib/services/admin-permission-service";
import { withActionErrorHandling } from "./with-error-handling";
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
