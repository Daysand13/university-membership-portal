import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  ApplicationStatus,
  MemberStatus,
  Prisma,
  type Member,
  type MembershipApplication,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email/client";
import {
  applicationReceivedEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  applicationChangesRequestedEmail,
  passwordResetEmail,
  adminNewApplicationNotificationEmail,
} from "@/lib/email/templates";
import type { EnrollmentInput } from "@/lib/validations/membership";

export class DuplicateIndexNumberError extends Error {
  constructor() {
    super("An application or member already exists with this index number.");
    this.name = "DuplicateIndexNumberError";
  }
}
export class DuplicateEmailError extends Error {
  constructor() {
    super("An account already exists with this email address.");
    this.name = "DuplicateEmailError";
  }
}
export class InvalidCredentialsError extends Error {
  constructor(message = "Incorrect index number or password.") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}
export class AccountNotActiveError extends Error {
  constructor() {
    super("This member account is not active. Contact the association for help.");
    this.name = "AccountNotActiveError";
  }
}
export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super("This password reset link is invalid or has expired. Request a new one.");
    this.name = "InvalidOrExpiredTokenError";
  }
}

interface DriverAdapterConstraintMeta {
  driverAdapterError?: {
    cause?: { constraint?: { fields?: string[] } };
  };
  target?: string[] | string;
}

/**
 * Prisma 7's driver-adapter errors report the violated field(s) in a
 * different shape than the classic engine did — verified directly against
 * a live unique-constraint violation rather than assumed (see the "the
 * driver-adapter shape" branch below).
 */
function isUniqueConstraintError(err: unknown, target: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const meta = err.meta as DriverAdapterConstraintMeta | undefined;
  const normalize = (f: string) => f.replace(/"/g, "").toLowerCase();

  if (Array.isArray(meta?.target) && meta.target.some((f) => normalize(f) === target.toLowerCase())) return true;
  if (typeof meta?.target === "string" && meta.target.toLowerCase().includes(target.toLowerCase())) return true;

  const driverFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(driverFields) && driverFields.some((f) => normalize(f) === target.toLowerCase())) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function submitApplication(
  input: EnrollmentInput,
  profileImageUrl: string | null,
  medicalReportUrl: string | null,
): Promise<MembershipApplication> {
  let application: MembershipApplication;
  try {
    application = await db.membershipApplication.create({
      data: {
        firstName: input.firstName,
        middleName: input.middleName || null,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        profileImageUrl,
        medicalReportUrl,
        phone: input.phone,
        email: input.email,
        indexNumber: input.indexNumber,
        applicationTrack: input.track,
        degreeCategory: input.degreeCategory || null,
        programme: input.programme,
        department: input.department,
        academicDepartment: input.academicDepartment,
        hallOfAffiliation: input.hallOfAffiliation || null,
        specificSupportNeeds: input.specificSupportNeeds ?? [],
        level: input.level,
        campus: input.campus,
        yearOfAdmission: input.yearOfAdmission,
        expectedGraduationYear: input.expectedGraduationYear ?? null,
        residentialAddress: input.residentialAddress,
        region: input.region,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        membershipType: input.membershipType,
        agreedToTerms: input.agreedToTerms,
        status: ApplicationStatus.PENDING,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err, "indexNumber")) throw new DuplicateIndexNumberError();
    throw err;
  }

  await db.notification.create({
    data: {
      type: "NEW_APPLICATION",
      title: `New membership application from ${application.firstName} ${application.lastName}`,
      link: `/admin/membership-applications/${application.id}`,
    },
  });

  const { subject, html } = applicationReceivedEmail({
    firstName: application.firstName,
    indexNumber: application.indexNumber,
  });
  await sendEmail({ to: application.email, subject, html });

  // Best-effort notify the membership team. Failure to notify never blocks
  // the applicant's confirmation — the application is already saved and
  // visible in the admin dashboard regardless.
  try {
    const notifyRecipients = await db.adminUser.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "MEMBERSHIP_OFFICER"] } },
      select: { email: true },
      take: 10,
    });
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/membership-applications/${application.id}`;
    const notice = adminNewApplicationNotificationEmail({
      applicantName: `${application.firstName} ${application.lastName}`,
      indexNumber: application.indexNumber,
      reviewUrl,
    });
    await Promise.all(
      notifyRecipients.map((admin) => sendEmail({ to: admin.email, subject: notice.subject, html: notice.html })),
    );
  } catch (err) {
    console.error("[membership] failed to notify admins of new application:", err);
  }

  return application;
}

export async function listApplications(filter?: { status?: ApplicationStatus; search?: string }) {
  return db.membershipApplication.findMany({
    where: {
      status: filter?.status,
      ...(filter?.search
        ? {
            OR: [
              { firstName: { contains: filter.search, mode: "insensitive" } },
              { lastName: { contains: filter.search, mode: "insensitive" } },
              { indexNumber: { contains: filter.search, mode: "insensitive" } },
              { email: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getApplicationById(id: string) {
  return db.membershipApplication.findUnique({
    where: { id },
    include: { reviewedBy: { select: { name: true, email: true } }, member: true },
  });
}

// ---------------------------------------------------------------------------
// Review workflow
// ---------------------------------------------------------------------------

export async function approveApplication(params: {
  applicationId: string;
  adminId: string;
  note?: string;
  loginUrl: string;
}): Promise<Member> {
  const { applicationId, adminId, note, loginUrl } = params;

  const application = await db.membershipApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error("Application not found.");
  if (application.status === ApplicationStatus.APPROVED) {
    throw new Error("This application has already been approved.");
  }

  // The temporary password is the applicant's phone number, normalized to
  // digits only so formatting differences (spaces, dashes) between what
  // they typed at enrollment and what they type at login can never cause a
  // silent mismatch — the same class of bug as the untrimmed-whitespace
  // issue elsewhere in this file.
  const temporaryPassword = application.phone.replace(/[^0-9]/g, "");
  const passwordHash = await hashPassword(temporaryPassword);

  const { member } = await db.$transaction(async (tx) => {
    let createdMember: Member;
    try {
      createdMember = await tx.member.create({
        data: {
          indexNumber: application.indexNumber,
          passwordHash,
          mustChangePassword: true,
          firstName: application.firstName,
          middleName: application.middleName,
          lastName: application.lastName,
          dateOfBirth: application.dateOfBirth,
          gender: application.gender,
          profileImageUrl: application.profileImageUrl,
          medicalReportUrl: application.medicalReportUrl,
          phone: application.phone,
          email: application.email,
          programme: application.programme,
          department: application.department,
          applicationTrack: application.applicationTrack,
          degreeCategory: application.degreeCategory,
          academicDepartment: application.academicDepartment,
          hallOfAffiliation: application.hallOfAffiliation,
          specificSupportNeeds: application.specificSupportNeeds,
          level: application.level,
          campus: application.campus,
          yearOfAdmission: application.yearOfAdmission,
          expectedGraduationYear: application.expectedGraduationYear,
          residentialAddress: application.residentialAddress,
          region: application.region,
          emergencyContactName: application.emergencyContactName,
          emergencyContactPhone: application.emergencyContactPhone,
          membershipType: application.membershipType,
          status: MemberStatus.ACTIVE,
          applicationId: application.id,
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err, "email")) throw new DuplicateEmailError();
      if (isUniqueConstraintError(err, "indexNumber")) throw new DuplicateIndexNumberError();
      throw err;
    }

    await tx.membershipApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        adminNote: note || null,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "APPROVE_APPLICATION",
        entityType: "MembershipApplication",
        entityId: applicationId,
        previousValue: { status: application.status },
        newValue: { status: "APPROVED", memberId: createdMember.id },
        note: note || null,
      },
    });

    return { member: createdMember };
  });

  const { subject, html } = applicationApprovedEmail({
    firstName: member.firstName,
    indexNumber: member.indexNumber,
    temporaryPassword,
    loginUrl,
  });
  await sendEmail({ to: member.email, subject, html });

  return member;
}

export async function rejectApplication(params: {
  applicationId: string;
  adminId: string;
  note?: string;
}): Promise<MembershipApplication> {
  const { applicationId, adminId, note } = params;
  const previous = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });

  const application = await db.membershipApplication.update({
    where: { id: applicationId },
    data: {
      status: ApplicationStatus.REJECTED,
      reviewedById: adminId,
      reviewedAt: new Date(),
      adminNote: note || null,
    },
  });

  await db.auditLog.create({
    data: {
      adminId,
      action: "REJECT_APPLICATION",
      entityType: "MembershipApplication",
      entityId: applicationId,
      previousValue: { status: previous.status },
      newValue: { status: "REJECTED" },
      note: note || null,
    },
  });

  const { subject, html } = applicationRejectedEmail({
    firstName: application.firstName,
    adminNote: note,
  });
  await sendEmail({ to: application.email, subject, html });

  return application;
}

export async function requestApplicationChanges(params: {
  applicationId: string;
  adminId: string;
  note: string;
}): Promise<MembershipApplication> {
  const { applicationId, adminId, note } = params;
  const previous = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });

  const application = await db.membershipApplication.update({
    where: { id: applicationId },
    data: {
      status: ApplicationStatus.UNDER_REVIEW,
      reviewedById: adminId,
      reviewedAt: new Date(),
      adminNote: note,
    },
  });

  await db.auditLog.create({
    data: {
      adminId,
      action: "REQUEST_APPLICATION_CHANGES",
      entityType: "MembershipApplication",
      entityId: applicationId,
      previousValue: { status: previous.status },
      newValue: { status: "UNDER_REVIEW" },
      note,
    },
  });

  const { subject, html } = applicationChangesRequestedEmail({ firstName: application.firstName, adminNote: note });
  await sendEmail({ to: application.email, subject, html });

  return application;
}

export async function setApplicationStatus(params: {
  applicationId: string;
  adminId: string;
  status: typeof ApplicationStatus.UNDER_REVIEW | typeof ApplicationStatus.SUSPENDED;
  note?: string;
}): Promise<MembershipApplication> {
  const { applicationId, adminId, status, note } = params;
  const previous = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });

  const application = await db.membershipApplication.update({
    where: { id: applicationId },
    data: { status, reviewedById: adminId, reviewedAt: new Date(), adminNote: note || null },
  });

  await db.auditLog.create({
    data: {
      adminId,
      action: `SET_APPLICATION_STATUS_${status}`,
      entityType: "MembershipApplication",
      entityId: applicationId,
      previousValue: { status: previous.status },
      newValue: { status },
      note: note || null,
    },
  });

  return application;
}

// ---------------------------------------------------------------------------
// Member auth + profile
// ---------------------------------------------------------------------------

export async function authenticateMember(indexNumber: string, password: string): Promise<Member> {
  const member = await db.member.findUnique({ where: { indexNumber } });
  if (!member) throw new InvalidCredentialsError();
  const valid = await verifyPassword(password, member.passwordHash);
  if (!valid) throw new InvalidCredentialsError();
  if (member.status !== MemberStatus.ACTIVE) throw new AccountNotActiveError();
  return member;
}

export async function changeMemberPassword(params: {
  memberId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { memberId, currentPassword, newPassword } = params;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  const valid = await verifyPassword(currentPassword, member.passwordHash);
  if (!valid) throw new InvalidCredentialsError("Current password is incorrect.");
  const passwordHash = await hashPassword(newPassword);
  await db.member.update({
    where: { id: memberId },
    data: { passwordHash, mustChangePassword: false },
  });
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function requestPasswordReset(email: string, resetBaseUrl: string): Promise<void> {
  const member = await db.member.findUnique({ where: { email } });
  // Deliberately identical behavior whether or not the email is registered,
  // so this endpoint can't be used to enumerate member accounts.
  if (!member) return;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.passwordResetToken.create({
    data: { tokenHash, memberId: member.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const { subject, html } = passwordResetEmail({
    firstName: member.firstName,
    resetUrl: `${resetBaseUrl}?token=${rawToken}`,
  });
  await sendEmail({ to: member.email, subject, html });
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new InvalidOrExpiredTokenError();
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.member.update({ where: { id: record.memberId }, data: { passwordHash, mustChangePassword: false } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

const EDITABLE_MEMBER_FIELDS = [
  "phone",
  "residentialAddress",
  "region",
  "emergencyContactName",
  "emergencyContactPhone",
  "profileImageUrl",
] as const;

export async function updateMemberProfile(
  memberId: string,
  updates: Partial<Pick<Member, (typeof EDITABLE_MEMBER_FIELDS)[number]>>,
): Promise<Member> {
  const safeUpdates: Record<string, unknown> = {};
  for (const field of EDITABLE_MEMBER_FIELDS) {
    if (field in updates) safeUpdates[field] = updates[field];
  }
  return db.member.update({ where: { id: memberId }, data: safeUpdates });
}

export async function listMembers(filter?: { search?: string }) {
  return db.member.findMany({
    where: filter?.search
      ? {
          OR: [
            { firstName: { contains: filter.search, mode: "insensitive" } },
            { lastName: { contains: filter.search, mode: "insensitive" } },
            { indexNumber: { contains: filter.search, mode: "insensitive" } },
            { email: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function setMemberStatus(params: {
  memberId: string;
  adminId: string;
  status: MemberStatus;
}): Promise<Member> {
  const { memberId, adminId, status } = params;
  const previous = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  const member = await db.member.update({ where: { id: memberId }, data: { status } });
  await db.auditLog.create({
    data: {
      adminId,
      action: "SET_MEMBER_STATUS",
      entityType: "Member",
      entityId: memberId,
      previousValue: { status: previous.status },
      newValue: { status },
    },
  });
  return member;
}
