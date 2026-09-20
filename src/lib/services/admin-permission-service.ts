import "server-only";
import { db } from "@/lib/db";
import { AdminRole } from "@/generated/prisma/client";
import {
  ALL_CAPABILITIES,
  ROLE_DEFAULTS,
  effectiveCapabilities,
  parsePermissionMask,
  type PermissionMask,
} from "@/lib/auth/capabilities";

/**
 * Who may do what, per administrator account.
 *
 * Only the differences from the base role are stored. Two people with the
 * same title but different jobs therefore differ by exactly the toggles
 * someone deliberately changed, and a later change to what a role means
 * reaches everyone who hadn't been singled out.
 */

export class AdminPermissionError extends Error {}

export async function listAdminAccounts() {
  const admins = await db.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, permissionMask: true, lastLoginAt: true },
  });
  return admins.map((admin) => ({
    ...admin,
    overrides: parsePermissionMask(admin.permissionMask),
    capabilities: [...effectiveCapabilities(admin.role, admin.permissionMask)],
  }));
}

export type AdminAccountSummary = Awaited<ReturnType<typeof listAdminAccounts>>[number];

/** Only what actually differs from the role's defaults is worth storing. */
export function overridesFrom(role: AdminRole, granted: string[]): PermissionMask {
  const defaults = new Set(ROLE_DEFAULTS[role] ?? []);
  const wanted = new Set(granted.filter((key) => ALL_CAPABILITIES.includes(key)));
  const mask: PermissionMask = {};
  for (const key of ALL_CAPABILITIES) {
    const isDefault = defaults.has(key);
    const isWanted = wanted.has(key);
    if (isDefault !== isWanted) mask[key] = isWanted;
  }
  return mask;
}

export async function updateAdminPermissions(params: {
  adminId: string;
  role: AdminRole;
  granted: string[];
  actor: { id: string; role: AdminRole };
}) {
  const { adminId, role, granted, actor } = params;

  // Editing your own permissions is how an administrator locks themselves —
  // and possibly everybody — out of the screen that would put it right.
  if (adminId === actor.id) {
    throw new AdminPermissionError("You can't change your own permissions. Ask another super administrator.");
  }

  const target = await db.adminUser.findUnique({ where: { id: adminId }, select: { id: true, name: true, role: true, permissionMask: true } });
  if (!target) throw new AdminPermissionError("That administrator account no longer exists.");

  // A super admin holds everything by definition, so there is nothing to
  // mask — storing toggles for one would only mislead whoever read them.
  const mask = role === AdminRole.SUPER_ADMIN ? {} : overridesFrom(role, granted);

  const [updated] = await db.$transaction([
    db.adminUser.update({
      where: { id: adminId },
      data: { role, permissionMask: mask },
      select: { id: true, name: true, role: true, permissionMask: true },
    }),
    db.auditLog.create({
      data: {
        adminId: actor.id,
        action: "UPDATE_ADMIN_PERMISSIONS",
        entityType: "AdminUser",
        entityId: adminId,
        previousValue: { role: target.role, overrides: parsePermissionMask(target.permissionMask) },
        newValue: { role, overrides: mask },
      },
    }),
  ]);

  return updated;
}
