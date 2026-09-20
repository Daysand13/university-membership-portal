import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { AdminRole, Prisma, type AdminUser } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import { adminInviteEmail } from "@/lib/email/templates";
import { DuplicateAdminEmailError } from "@/lib/services/admin-auth-service";

/**
 * Creating and retiring administrator accounts.
 *
 * An account is created with no usable password: a random secret nobody
 * has ever seen is hashed into the row, and the only way in is the invite
 * link emailed to the person themselves. So nobody has to send a colleague
 * a password, no shared temporary password lingers in an inbox, and an
 * account that is never accepted is never usable.
 */

export class AdminAccountError extends Error {}

/** Long enough to survive an unread inbox, short enough not to be a standing key. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  EDITOR: "Editor",
  MEMBERSHIP_OFFICER: "Membership Officer",
  LIBRARIAN: "Librarian",
  ELECTION_OFFICER: "Election Officer",
};

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Issues a fresh invite and emails it, invalidating any earlier unused one. */
async function sendInvite(params: { admin: Pick<AdminUser, "id" | "name" | "email" | "role">; inviteBaseUrl: string }) {
  const { admin, inviteBaseUrl } = params;
  const rawToken = randomBytes(32).toString("hex");

  await db.$transaction([
    // An older link becoming useless the moment a new one is sent is the
    // point: one live invitation at a time, per account.
    db.adminPasswordResetToken.updateMany({
      where: { adminId: admin.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.adminPasswordResetToken.create({
      data: { tokenHash: hashToken(rawToken), adminId: admin.id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    }),
  ]);

  const { subject, html } = adminInviteEmail({
    name: admin.name,
    roleLabel: ADMIN_ROLE_LABELS[admin.role],
    setPasswordUrl: `${inviteBaseUrl}?token=${rawToken}`,
    brand: await getEmailBrand(),
  });
  // Never throws — it reports whether the provider took it, and the
  // caller says so, because an invitation nobody received is the whole
  // difference between an account that can be used and one that can't.
  const { delivered } = await sendEmail({
    to: admin.email,
    subject,
    html,
    template: "admin-invite",
    entityType: "AdminUser",
    entityId: admin.id,
  });
  return { delivered };
}

export async function createAdminAccount(params: {
  name: string;
  email: string;
  role: AdminRole;
  actorId: string;
  inviteBaseUrl: string;
  /** The person's existing account on the site, where they already have one. */
  userId?: string | null;
}): Promise<{ admin: AdminUser; invitationEmailed: boolean }> {
  const { name, email, role, actorId, inviteBaseUrl, userId } = params;

  // Hashed, never recorded, never sent: it exists only so the column is
  // filled with something no password can ever match.
  const unusablePassword = await hashPassword(randomBytes(32).toString("hex"));

  let admin: AdminUser;
  try {
    admin = await db.adminUser.create({
      data: { name, email, role, passwordHash: unusablePassword, isActive: true, userId: userId ?? null },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DuplicateAdminEmailError();
    }
    throw err;
  }

  await db.auditLog.create({
    data: {
      adminId: actorId,
      action: "CREATE_ADMIN_ACCOUNT",
      entityType: "AdminUser",
      entityId: admin.id,
      newValue: { name, email, role },
      note: "Invitation emailed; the account has no password until they set one.",
    },
  });

  const { delivered } = await sendInvite({ admin, inviteBaseUrl });
  return { admin, invitationEmailed: delivered };
}

export async function resendAdminInvite(params: { adminId: string; actorId: string; inviteBaseUrl: string }) {
  const admin = await db.adminUser.findUnique({
    where: { id: params.adminId },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
  });
  if (!admin) throw new AdminAccountError("That administrator account no longer exists.");

  const { delivered } = await sendInvite({ admin, inviteBaseUrl: params.inviteBaseUrl });
  await db.auditLog.create({
    data: {
      adminId: params.actorId,
      action: "RESEND_ADMIN_INVITE",
      entityType: "AdminUser",
      entityId: admin.id,
      note: delivered ? "A fresh link was emailed." : "The email could not be sent; the link was issued but not delivered.",
    },
  });
  return { ...admin, invitationEmailed: delivered };
}

/**
 * Turns an account off (or back on). Deactivating is how an administrator
 * leaves: their name stays on everything they did, and the account can't
 * sign in. Deleting would take the history with it.
 */
export async function setAdminActive(params: { adminId: string; isActive: boolean; actorId: string }) {
  const { adminId, isActive, actorId } = params;
  if (adminId === actorId) {
    throw new AdminAccountError("You can't deactivate your own account. Ask another super administrator.");
  }

  const admin = await db.adminUser.findUnique({ where: { id: adminId }, select: { id: true, name: true, role: true, isActive: true } });
  if (!admin) throw new AdminAccountError("That administrator account no longer exists.");

  // Somebody has to be left who can manage accounts and permissions.
  if (!isActive && admin.role === AdminRole.SUPER_ADMIN) {
    const otherSuperAdmins = await db.adminUser.count({
      where: { role: AdminRole.SUPER_ADMIN, isActive: true, id: { not: adminId } },
    });
    if (otherSuperAdmins === 0) {
      throw new AdminAccountError("This is the only active super administrator. Appoint another one first.");
    }
  }

  const [updated] = await db.$transaction([
    db.adminUser.update({ where: { id: adminId }, data: { isActive }, select: { id: true, name: true, isActive: true } }),
    db.auditLog.create({
      data: {
        adminId: actorId,
        action: isActive ? "REACTIVATE_ADMIN_ACCOUNT" : "DEACTIVATE_ADMIN_ACCOUNT",
        entityType: "AdminUser",
        entityId: adminId,
        previousValue: { isActive: admin.isActive },
        newValue: { isActive },
      },
    }),
  ]);
  return updated;
}

export class InvalidAdminInviteError extends Error {
  constructor() {
    super("That link has expired or has already been used. Ask a super administrator to send a new one.");
    this.name = "InvalidAdminInviteError";
  }
}

/** The other end of the invitation: the new administrator choosing their own password. */
export async function setAdminPasswordWithToken(rawToken: string, newPassword: string): Promise<AdminUser> {
  const record = await db.adminPasswordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new InvalidAdminInviteError();
  }

  const passwordHash = await hashPassword(newPassword);
  const [admin] = await db.$transaction([
    db.adminUser.update({ where: { id: record.adminId }, data: { passwordHash } }),
    db.adminPasswordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.auditLog.create({
      data: {
        adminId: record.adminId,
        action: "SET_ADMIN_PASSWORD",
        entityType: "AdminUser",
        entityId: record.adminId,
        note: "Set from an invitation link.",
      },
    }),
  ]);
  return admin;
}
