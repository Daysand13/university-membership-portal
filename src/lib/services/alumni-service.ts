import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { type AlumniProfile, AlumniStatus } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import { alumniGraduationInviteEmail, alumniWelcomeEmail, alumniPasswordResetEmail } from "@/lib/email/templates";
import type { AlumniRegisterInput } from "@/lib/validations/alumni";

export class DuplicateAlumniEmailError extends Error {
  constructor() {
    super("An alumni account already exists with this email address.");
    this.name = "DuplicateAlumniEmailError";
  }
}

export class InvalidAlumniCredentialsError extends Error {
  constructor(message = "Incorrect email or password.") {
    super(message);
    this.name = "InvalidAlumniCredentialsError";
  }
}

export class AlumniAccountNotActiveError extends Error {
  constructor() {
    super("This alumni account is not active. Contact the association for help.");
    this.name = "AlumniAccountNotActiveError";
  }
}

export class AlumniPasswordNotSetError extends Error {
  constructor() {
    super("This account doesn't have a password set yet. Use the link from your invitation email, or request a new one.");
    this.name = "AlumniPasswordNotSetError";
  }
}

export class InvalidOrExpiredAlumniTokenError extends Error {
  constructor() {
    super("This link is invalid or has expired. Request a new one.");
    this.name = "InvalidOrExpiredAlumniTokenError";
  }
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Registration (self-serve, for graduates who were never a student member
// in this system) and authentication
// ---------------------------------------------------------------------------

export async function registerAlumni(input: AlumniRegisterInput): Promise<AlumniProfile> {
  const existing = await db.alumniProfile.findUnique({ where: { email: input.email } });
  if (existing) throw new DuplicateAlumniEmailError();

  const passwordHash = await hashPassword(input.password);
  const alumni = await db.alumniProfile.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      graduationYear: input.graduationYear,
      programme: input.programme,
      profession: input.profession || null,
      currentLocation: input.currentLocation || null,
      directoryVisible: true,
      status: AlumniStatus.ACTIVE,
    },
  });

  const { subject, html } = alumniWelcomeEmail({ firstName: alumni.fullName.split(" ")[0], brand: await getEmailBrand() });
  await sendEmail({ to: alumni.email, subject, html, template: "alumni-welcome", entityType: "AlumniProfile", entityId: alumni.id });

  return alumni;
}

export async function authenticateAlumni(email: string, password: string): Promise<AlumniProfile> {
  const alumni = await db.alumniProfile.findUnique({ where: { email } });
  if (!alumni) throw new InvalidAlumniCredentialsError();
  if (!alumni.passwordHash) throw new AlumniPasswordNotSetError();
  const valid = await verifyPassword(password, alumni.passwordHash);
  if (!valid) throw new InvalidAlumniCredentialsError();
  if (alumni.status !== AlumniStatus.ACTIVE) throw new AlumniAccountNotActiveError();
  return alumni;
}

// ---------------------------------------------------------------------------
// Automatic promotion — an admin marks a graduating student Member as
// graduated, and this creates their Alumni Portal account for them,
// carrying over their details and inviting them to set a password.
// ---------------------------------------------------------------------------

export async function promoteMemberToAlumni(params: {
  memberId: string;
  graduationYear: number;
  inviteBaseUrl: string;
}): Promise<AlumniProfile> {
  const { memberId, graduationYear, inviteBaseUrl } = params;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });

  if (member.graduatedAt) {
    throw new Error("This member has already been marked as graduated.");
  }

  const existingByEmail = await db.alumniProfile.findUnique({ where: { email: member.email } });
  if (existingByEmail) throw new DuplicateAlumniEmailError();

  const [, alumni] = await db.$transaction([
    db.member.update({ where: { id: memberId }, data: { graduatedAt: new Date() } }),
    db.alumniProfile.create({
      data: {
        fullName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        phone: member.phone,
        profileImageUrl: member.profileImageUrl,
        graduationYear,
        programme: member.programme,
        mustSetPassword: true,
        directoryVisible: true,
        status: AlumniStatus.ACTIVE,
        sourceMemberId: member.id,
      },
    }),
  ]);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.alumniPasswordResetToken.create({
    data: { tokenHash, alumniId: alumni.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const { subject, html } = alumniGraduationInviteEmail({
    firstName: member.firstName,
    setPasswordUrl: `${inviteBaseUrl}?token=${rawToken}`,
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: alumni.email,
    subject,
    html,
    template: "alumni-graduation-invite",
    entityType: "AlumniProfile",
    entityId: alumni.id,
  });

  return alumni;
}

// ---------------------------------------------------------------------------
// Password management (shared by "set initial password" after an invite,
// and ordinary "forgot password")
// ---------------------------------------------------------------------------

export async function requestAlumniPasswordReset(email: string, resetBaseUrl: string): Promise<void> {
  const alumni = await db.alumniProfile.findUnique({ where: { email } });
  // Deliberately identical behavior whether or not the email is
  // registered, so this endpoint can't be used to enumerate accounts.
  if (!alumni) return;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.alumniPasswordResetToken.create({
    data: { tokenHash, alumniId: alumni.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const { subject, html } = alumniPasswordResetEmail({
    firstName: alumni.fullName.split(" ")[0],
    resetUrl: `${resetBaseUrl}?token=${rawToken}`,
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: alumni.email,
    subject,
    html,
    template: "alumni-password-reset",
    entityType: "AlumniProfile",
    entityId: alumni.id,
  });
}

export async function setAlumniPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const record = await db.alumniPasswordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new InvalidOrExpiredAlumniTokenError();
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.alumniProfile.update({ where: { id: record.alumniId }, data: { passwordHash, mustSetPassword: false } }),
    db.alumniPasswordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function changeAlumniPassword(params: {
  alumniId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { alumniId, currentPassword, newPassword } = params;
  const alumni = await db.alumniProfile.findUniqueOrThrow({ where: { id: alumniId } });
  if (!alumni.passwordHash) throw new AlumniPasswordNotSetError();
  const valid = await verifyPassword(currentPassword, alumni.passwordHash);
  if (!valid) throw new InvalidAlumniCredentialsError("Current password is incorrect.");
  const passwordHash = await hashPassword(newPassword);
  await db.alumniProfile.update({ where: { id: alumniId }, data: { passwordHash, mustSetPassword: false } });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const EDITABLE_ALUMNI_FIELDS = [
  "fullName",
  "phone",
  "profession",
  "currentLocation",
  "bio",
  "willingToMentor",
  "directoryVisible",
  "profileImageUrl",
] as const;

export async function updateAlumniProfile(
  alumniId: string,
  updates: Partial<Pick<AlumniProfile, (typeof EDITABLE_ALUMNI_FIELDS)[number]>>,
): Promise<AlumniProfile> {
  const safeUpdates: Record<string, unknown> = {};
  for (const field of EDITABLE_ALUMNI_FIELDS) {
    if (field in updates) safeUpdates[field] = updates[field];
  }
  return db.alumniProfile.update({ where: { id: alumniId }, data: safeUpdates });
}

// ---------------------------------------------------------------------------
// Directory & Mentorship Board (public, to logged-in alumni only)
// ---------------------------------------------------------------------------

export async function searchAlumniDirectory(query?: string) {
  return db.alumniProfile.findMany({
    where: {
      status: AlumniStatus.ACTIVE,
      directoryVisible: true,
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { programme: { contains: query, mode: "insensitive" } },
              { profession: { contains: query, mode: "insensitive" } },
              { currentLocation: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { fullName: "asc" },
  });
}

export async function listMentors() {
  return db.alumniProfile.findMany({
    where: { status: AlumniStatus.ACTIVE, directoryVisible: true, willingToMentor: true },
    orderBy: { fullName: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Admin management
// ---------------------------------------------------------------------------

export async function listAlumniForAdmin(filter?: { search?: string }) {
  return db.alumniProfile.findMany({
    where: filter?.search
      ? {
          OR: [
            { fullName: { contains: filter.search, mode: "insensitive" } },
            { email: { contains: filter.search, mode: "insensitive" } },
            { programme: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function setAlumniStatus(params: { alumniId: string; status: AlumniStatus }): Promise<AlumniProfile> {
  return db.alumniProfile.update({ where: { id: params.alumniId }, data: { status: params.status } });
}

export async function deleteAlumni(params: { alumniId: string; adminId: string; note?: string }): Promise<void> {
  const { alumniId, adminId, note } = params;
  const alumni = await db.alumniProfile.findUniqueOrThrow({ where: { id: alumniId } });

  await db.$transaction([
    db.alumniProfile.delete({ where: { id: alumniId } }),
    db.auditLog.create({
      data: {
        adminId,
        action: "DELETE_ALUMNI",
        entityType: "AlumniProfile",
        entityId: alumniId,
        previousValue: { fullName: alumni.fullName, email: alumni.email },
        note: note || null,
      },
    }),
  ]);
}
