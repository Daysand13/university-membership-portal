import "server-only";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { Prisma, type AdminUser } from "@/generated/prisma/client";
import { InvalidCredentialsError } from "./membership-service";

export class DuplicateAdminEmailError extends Error {
  constructor() {
    super("Another admin account already uses that email address.");
    this.name = "DuplicateAdminEmailError";
  }
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminUser> {
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw new InvalidCredentialsError("Incorrect email or password.");
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) throw new InvalidCredentialsError("Incorrect email or password.");
  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return admin;
}

export async function changeAdminPassword(params: {
  adminId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { adminId, currentPassword, newPassword } = params;
  const admin = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) throw new InvalidCredentialsError("Current password is incorrect.");
  const passwordHash = await hashPassword(newPassword);
  await db.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}

/**
 * Changing the login email is treated the same as a password change,
 * security-wise: it requires re-confirming the current password, since
 * it's changing what counts as the account's identity.
 */
export async function changeAdminEmail(params: {
  adminId: string;
  currentPassword: string;
  newEmail: string;
}): Promise<AdminUser> {
  const { adminId, currentPassword, newEmail } = params;
  const admin = await db.adminUser.findUniqueOrThrow({ where: { id: adminId } });
  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) throw new InvalidCredentialsError("Current password is incorrect.");

  try {
    return await db.adminUser.update({ where: { id: adminId }, data: { email: newEmail } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DuplicateAdminEmailError();
    }
    throw err;
  }
}

/**
 * Display name is low-risk/cosmetic (unlike email/password, it isn't part
 * of how the account is authenticated), so this doesn't require a password
 * confirmation.
 */
export async function updateAdminName(params: { adminId: string; name: string }): Promise<AdminUser> {
  const { adminId, name } = params;
  return db.adminUser.update({ where: { id: adminId }, data: { name } });
}
