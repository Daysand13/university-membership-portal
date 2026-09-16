import "server-only";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { Prisma, type AdminRole, type PatronProfile, type PatronStatus } from "@/generated/prisma/client";
import {
  PATRON_RESET_TTL_MINUTES,
  passwordFingerprint,
  readPatronResetToken,
  signPatronResetToken,
} from "@/lib/auth/patron-reset-token";
import type { PatronDecision, PatronProfileUpdateInput, PatronRegisterInput } from "@/lib/validations/patron";
import {
  notifyAdminsOfPatronApplication,
  notifyPasswordChanged,
  notifyPatronApplicationReceived,
  notifyPatronDecision,
  notifyPatronPasswordReset,
  notifyPatronRemoved,
  patronSalutation,
} from "@/lib/services/account-notification-service";

/**
 * Patrons: people who apply online to become a patron of the association,
 * are approved or rejected by an administrator, and once approved sign in to
 * the Patrons' Portal. See PatronProfile in the schema.
 */

export class DuplicatePatronEmailError extends Error {
  constructor() {
    super("An application with this email address already exists. If you've applied before, sign in instead — or contact the association.");
    this.name = "DuplicatePatronEmailError";
  }
}

export class InvalidPatronCredentialsError extends Error {
  constructor() {
    super("Incorrect email address or password.");
    this.name = "InvalidPatronCredentialsError";
  }
}

const NOT_APPROVED_MESSAGE: Record<Exclude<PatronStatus, "APPROVED">, string> = {
  PENDING: "Your patron application is still being reviewed. We'll email you as soon as a decision has been made.",
  REJECTED: "Your patron application wasn't approved, so this account can't sign in. Please contact the association if you have any questions.",
  SUSPENDED: "This patron account has been suspended. Please contact the association for help.",
};

export class PatronNotApprovedError extends Error {
  constructor(readonly status: Exclude<PatronStatus, "APPROVED">) {
    super(NOT_APPROVED_MESSAGE[status]);
    this.name = "PatronNotApprovedError";
  }
}

/** A review the current state doesn't allow — shown to the admin as is. */
export class PatronReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatronReviewError";
  }
}

export class IncorrectPatronPasswordError extends Error {
  constructor() {
    super("Your current password is incorrect.");
    this.name = "IncorrectPatronPasswordError";
  }
}

function optional(value: string | undefined): string | null {
  return value ? value : null;
}

// ---------------------------------------------------------------------------
// Applying
// ---------------------------------------------------------------------------

export async function registerPatron(input: PatronRegisterInput): Promise<PatronProfile> {
  const passwordHash = await hashPassword(input.password);
  const details = {
    title: optional(input.title),
    fullName: input.fullName,
    phone: input.phone,
    occupation: input.occupation,
    organization: optional(input.organization),
    jobTitle: optional(input.jobTitle),
    address: optional(input.address),
    region: optional(input.region),
    supportInterest: optional(input.supportInterest),
    motivation: optional(input.motivation),
    passwordHash,
  };

  const existing = await db.patronProfile.findUnique({ where: { email: input.email } });
  let patron: PatronProfile;
  if (existing) {
    // Someone turned down before may apply again, as a fresh application.
    // Anyone else with this email already has an application or an account.
    if (existing.status !== "REJECTED") throw new DuplicatePatronEmailError();
    patron = await db.patronProfile.update({
      where: { id: existing.id },
      data: { ...details, status: "PENDING", reviewedById: null, reviewedAt: null, adminNote: null, submittedAt: new Date() },
    });
  } else {
    try {
      patron = await db.patronProfile.create({ data: { ...details, email: input.email } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new DuplicatePatronEmailError();
      throw err;
    }
  }

  // The application is saved. Everything below is best-effort: a failed
  // notification must not tell the applicant their application failed.
  try {
    await db.notification.create({
      data: {
        type: "NEW_APPLICATION",
        title: `New patron application from ${patron.fullName}`,
        link: `/admin/patrons/${patron.id}`,
      },
    });
  } catch (err) {
    console.error(`[patrons] application ${patron.id} saved, but the admin notification failed:`, err);
  }
  await Promise.all([notifyPatronApplicationReceived(patron), notifyAdminsOfPatronApplication(patron)]);

  return patron;
}

// ---------------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------------

export async function authenticatePatron(email: string, password: string): Promise<PatronProfile> {
  const patron = await db.patronProfile.findUnique({ where: { email: email.trim().toLowerCase() } });
  // The same message for an unknown email and a wrong password, so this form
  // can't be used to find out who has applied. The application's status is
  // only revealed to someone who knows the password.
  if (!patron || !(await verifyPassword(password, patron.passwordHash))) {
    throw new InvalidPatronCredentialsError();
  }
  if (patron.status !== "APPROVED") throw new PatronNotApprovedError(patron.status);
  return patron;
}

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------

export async function listPatrons(filter: { status?: PatronStatus; search?: string } = {}) {
  const search = filter.search?.trim();
  return db.patronProfile.findMany({
    where: {
      status: filter.status,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { occupation: { contains: search, mode: "insensitive" } },
              { organization: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function countPatronsByStatus(): Promise<Record<PatronStatus, number>> {
  const counts: Record<PatronStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPENDED: 0 };
  const rows = await db.patronProfile.groupBy({ by: ["status"], _count: { _all: true } });
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

export async function getPatronById(id: string) {
  return db.patronProfile.findUnique({
    where: { id },
    include: { reviewedBy: { select: { name: true, email: true } } },
  });
}

const DECISION_STATUS: Record<PatronDecision, PatronStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  SUSPEND: "SUSPENDED",
};

/**
 * What an admin can do from each state. Rejecting is for applications; an
 * approved patron is suspended instead, and a suspended or rejected one can
 * be approved again.
 */
export const ALLOWED_PATRON_DECISIONS: Record<PatronStatus, PatronDecision[]> = {
  PENDING: ["APPROVE", "REJECT"],
  REJECTED: ["APPROVE"],
  APPROVED: ["SUSPEND"],
  SUSPENDED: ["APPROVE"],
};

export async function reviewPatron(params: {
  patronId: string;
  adminId: string;
  decision: PatronDecision;
  note?: string;
}): Promise<PatronProfile> {
  const { patronId, adminId, decision } = params;
  const note = params.note?.trim() || null;

  const patron = await db.patronProfile.findUnique({ where: { id: patronId } });
  if (!patron) throw new PatronReviewError("That patron application no longer exists.");
  if (!ALLOWED_PATRON_DECISIONS[patron.status].includes(decision)) {
    throw new PatronReviewError(
      `This patron is currently ${patron.status.toLowerCase()}, so that isn't possible. Refresh the page to see where it stands.`,
    );
  }
  const status = DECISION_STATUS[decision];

  const updated = await db.$transaction(async (tx) => {
    // Guarded on the status it was read with, so two admins deciding at the
    // same moment can't both succeed and send contradictory emails.
    const { count } = await tx.patronProfile.updateMany({
      where: { id: patronId, status: patron.status },
      data: { status, reviewedById: adminId, reviewedAt: new Date(), adminNote: note },
    });
    if (count === 0) {
      throw new PatronReviewError("This application was just changed by someone else. Refresh the page to see where it stands.");
    }
    await tx.auditLog.create({
      data: {
        adminId,
        action: `PATRON_${status}`,
        entityType: "PatronProfile",
        entityId: patronId,
        previousValue: { status: patron.status },
        newValue: { status },
        note,
      },
    });
    return tx.patronProfile.findUniqueOrThrow({ where: { id: patronId } });
  });

  await notifyPatronDecision({ patron: updated, status, previousStatus: patron.status, note });
  return updated;
}

// ---------------------------------------------------------------------------
// The patron's own account
// ---------------------------------------------------------------------------

export async function updatePatronProfile(patronId: string, input: PatronProfileUpdateInput): Promise<PatronProfile> {
  return db.patronProfile.update({
    where: { id: patronId },
    data: {
      title: optional(input.title),
      fullName: input.fullName,
      phone: input.phone,
      occupation: input.occupation,
      organization: optional(input.organization),
      jobTitle: optional(input.jobTitle),
      address: optional(input.address),
      region: optional(input.region),
    },
  });
}

export async function changePatronPassword(patronId: string, currentPassword: string, newPassword: string): Promise<void> {
  const patron = await db.patronProfile.findUniqueOrThrow({ where: { id: patronId } });
  if (!(await verifyPassword(currentPassword, patron.passwordHash))) throw new IncorrectPatronPasswordError();

  await db.patronProfile.update({ where: { id: patronId }, data: { passwordHash: await hashPassword(newPassword) } });
  await notifyPasswordChanged({
    portal: "Patron",
    email: patron.email,
    firstName: patronSalutation(patron),
    entityType: "PatronProfile",
    entityId: patron.id,
  });
}

// ---------------------------------------------------------------------------
// Forgotten passwords
// ---------------------------------------------------------------------------

export class InvalidPatronResetLinkError extends Error {
  constructor() {
    super("This password reset link is invalid, has expired, or has already been used. Please request a new one.");
    this.name = "InvalidPatronResetLinkError";
  }
}

/**
 * Emails a password reset link. Does nothing — and says nothing different —
 * for an email with no patron behind it, or a rejected application, so the
 * form can't be used to find out who has applied. A pending applicant can
 * reset theirs: they'll need it once approved.
 */
export async function requestPatronPasswordReset(email: string): Promise<void> {
  const patron = await db.patronProfile.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!patron || patron.status === "REJECTED") return;

  const token = await signPatronResetToken(patron);
  await notifyPatronPasswordReset({
    patron,
    resetPath: `/patrons/reset-password?token=${encodeURIComponent(token)}`,
    expiresInMinutes: PATRON_RESET_TTL_MINUTES,
  });
}

/** The patron a reset link belongs to, if it's still usable (see patron-reset-token.ts). */
async function patronForResetLink(token: string): Promise<PatronProfile | null> {
  const claims = await readPatronResetToken(token);
  if (!claims) return null;
  const patron = await db.patronProfile.findUnique({ where: { id: claims.patronId } });
  if (!patron || patron.status === "REJECTED") return null;
  if (passwordFingerprint(patron.passwordHash) !== claims.fingerprint) return null;
  return patron;
}

export async function isPatronResetLinkValid(token: string): Promise<boolean> {
  return (await patronForResetLink(token)) !== null;
}

export async function resetPatronPassword(token: string, newPassword: string): Promise<PatronProfile> {
  const patron = await patronForResetLink(token);
  if (!patron) throw new InvalidPatronResetLinkError();

  // Guarded on the password hash the link was issued for, so the same link
  // submitted twice (two tabs, a double tap) can only change it once.
  const { count } = await db.patronProfile.updateMany({
    where: { id: patron.id, passwordHash: patron.passwordHash },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  if (count === 0) throw new InvalidPatronResetLinkError();

  await notifyPasswordChanged({
    portal: "Patron",
    email: patron.email,
    firstName: patronSalutation(patron),
    entityType: "PatronProfile",
    entityId: patron.id,
  });
  return patron;
}

// ---------------------------------------------------------------------------
// Deleting
// ---------------------------------------------------------------------------

export class PatronDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatronDeleteError";
  }
}

/**
 * An approved or suspended patron is a real sign-in, so only a super admin
 * may delete one — the same rule as deleting a member. Applications (pending
 * or rejected) can be deleted by the membership team.
 */
export function canDeletePatron(adminRole: AdminRole, status: PatronStatus): boolean {
  if (adminRole === "SUPER_ADMIN") return true;
  return adminRole === "MEMBERSHIP_OFFICER" && (status === "PENDING" || status === "REJECTED");
}

export async function deletePatron(params: {
  patronId: string;
  adminId: string;
  adminRole: AdminRole;
  /** Email the person that their application or account was removed. */
  notify: boolean;
}): Promise<void> {
  const { patronId, adminId, adminRole, notify } = params;
  const patron = await db.patronProfile.findUnique({ where: { id: patronId } });
  if (!patron) return; // Already gone — nothing left to do.

  if (!canDeletePatron(adminRole, patron.status)) {
    throw new PatronDeleteError("Only a super admin can delete an approved or suspended patron account.");
  }

  // The audit entry keeps who they were, since the record itself is gone.
  await db.$transaction([
    db.patronProfile.delete({ where: { id: patronId } }),
    db.auditLog.create({
      data: {
        adminId,
        action: "DELETE_PATRON",
        entityType: "PatronProfile",
        entityId: patronId,
        previousValue: {
          title: patron.title,
          fullName: patron.fullName,
          email: patron.email,
          phone: patron.phone,
          occupation: patron.occupation,
          organization: patron.organization,
          status: patron.status,
          submittedAt: patron.submittedAt.toISOString(),
        },
      },
    }),
  ]);

  if (notify) {
    await notifyPatronRemoved({ patron, wasAccount: patron.status === "APPROVED" || patron.status === "SUSPENDED" });
  }
}
