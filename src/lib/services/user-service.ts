import "server-only";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import type { User } from "@/generated/prisma/client";

export class InvalidLoginError extends Error {
  constructor() {
    super("Those details don't match an account. Check and try again.");
    this.name = "InvalidLoginError";
  }
}

export class NoActiveRoleError extends Error {
  constructor() {
    super("This account isn't active. Please contact the association for help.");
    this.name = "NoActiveRoleError";
  }
}

export class PasswordNotSetError extends Error {
  constructor() {
    super("This account doesn't have a password set yet. Use the link from your invitation email, or request a new one.");
    this.name = "PasswordNotSetError";
  }
}

/** The other records a person's password can live on — see authenticateUser. */
const PASSWORD_SOURCES = {
  member: { select: { passwordHash: true } },
  alumniProfile: { select: { passwordHash: true } },
} as const;

/**
 * Signs someone in from one box, whichever identifier they're used to.
 *
 * Students know their index number and alumni know their email, and after
 * furthering their studies the same person may reasonably reach for either —
 * so the gateway accepts both rather than making people remember which
 * identity they're wearing today. An index number resolves through the
 * enrollment that carries it, which also means a returning student's NEW
 * index number works the moment that enrollment exists, without their old
 * one being disturbed.
 */
export async function authenticateUser(identifier: string, password: string): Promise<User> {
  const raw = identifier.trim();
  if (!raw) throw new InvalidLoginError();

  const user = raw.includes("@")
    ? await db.user.findUnique({ where: { email: raw.toLowerCase() }, include: PASSWORD_SOURCES })
    : await resolveByIndexNumber(raw);

  if (!user) throw new InvalidLoginError();

  // One person can hold up to three passwords: the account's own, the one on
  // their student record, and the one on their alumni profile. Only the last
  // two ever change — changing a member password, or setting an alumni one
  // from an invite, updates that record alone — so checking the account's
  // password only turned people away here with the password they actually
  // use, while the student and alumni sign-in pages, which read those
  // records, accepted it. Any of the person's current passwords works.
  const hashes = [...new Set([user.passwordHash, user.member?.passwordHash, user.alumniProfile?.passwordHash])].filter(
    (hash): hash is string => typeof hash === "string" && hash.length > 0,
  );

  // An alumnus invited but never activated has no usable password. Say so
  // plainly instead of "wrong credentials", which would send them round in
  // circles retrying a password they never set.
  if (hashes.length === 0) throw new PasswordNotSetError();

  let valid = false;
  for (const hash of hashes) {
    if (await verifyPassword(password, hash)) {
      valid = true;
      break;
    }
  }
  if (!valid) throw new InvalidLoginError();

  const roles = await db.userRole.findMany({ where: { userId: user.id } });
  if (roles.length === 0) throw new NoActiveRoleError();

  return user;
}

async function resolveByIndexNumber(indexNumber: string) {
  const enrollment = await db.studentEnrollment.findUnique({
    where: { indexNumber },
    include: { user: { include: PASSWORD_SOURCES } },
  });
  if (enrollment) return enrollment.user;

  // Fall back to the legacy member record for anyone whose enrollment row
  // hasn't been backfilled — belt and braces during the migration, so a gap
  // in the new tables can never cost someone their login.
  const member = await db.member.findUnique({
    where: { indexNumber },
    include: { user: { include: PASSWORD_SOURCES } },
  });
  return member?.user ?? null;
}

/** Roles currently granted, filtered to those whose underlying record is active. */
export async function getActiveRolesForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      member: { select: { status: true } },
      alumniProfile: { select: { status: true } },
      adminUser: { select: { isActive: true } },
    },
  });
  if (!user) return [];

  return user.roles
    .map((r) => r.role)
    .filter((role) => {
      if (role === "MEMBER") return user.member?.status === "ACTIVE";
      if (role === "ALUMNI") return user.alumniProfile?.status === "ACTIVE";
      if (role === "ADMIN") return user.adminUser?.isActive === true;
      return false;
    });
}
