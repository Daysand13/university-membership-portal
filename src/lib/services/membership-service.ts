import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  ApplicationStatus,
  MemberStatus,
  Prisma,
  type Member,
  type MembershipApplication,
  type AlumniProfile,
  type Gender,
  type MembershipType,
  type ApplicationTrack,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import {
  applicationReceivedEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  applicationChangesRequestedEmail,
  passwordResetEmail,
  profileUpdatedEmail,
  adminNewApplicationNotificationEmail,
} from "@/lib/email/templates";
import type { EnrollmentInput, MemberAdminEditInput, AlumniFurtherStudiesInput } from "@/lib/validations/membership";
import { formatFullName } from "@/lib/format";

export class DuplicateIndexNumberError extends Error {
  constructor() {
    super("An application or member already exists with this index number.");
    this.name = "DuplicateIndexNumberError";
  }
}
export class ApplicationAlreadyApprovedError extends Error {
  constructor() {
    super(
      "This application was already approved and has an active member account. Its status can't be changed from here — manage the member directly instead.",
    );
    this.name = "ApplicationAlreadyApprovedError";
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
    application = await withDbRetry(() =>
      db.membershipApplication.create({
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
      }),
    );
  } catch (err) {
    if (isUniqueConstraintError(err, "indexNumber")) throw new DuplicateIndexNumberError();
    throw err;
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAST THIS POINT THE APPLICATION IS SAVED. Nothing below may throw.
  //
  // Everything that follows is secondary (an admin notification row, a
  // confirmation email). If any of it fails, the applicant's record still
  // exists and is visible to admins — so reporting an error to the person
  // would be actively wrong: they'd retry, hit the duplicate-index-number
  // check, and conclude their application failed when it actually
  // succeeded the first time. Each step is therefore isolated and
  // best-effort, and failures are logged for follow-up instead.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await db.notification.create({
      data: {
        type: "NEW_APPLICATION",
        title: `New membership application from ${application.firstName} ${application.lastName}`,
        link: `/admin/membership-applications/${application.id}`,
      },
    });
  } catch (err) {
    console.error(`[enroll] application ${application.id} saved, but admin notification failed:`, err);
  }

  let brand;
  try {
    brand = await getEmailBrand();
  } catch (err) {
    console.error(`[enroll] application ${application.id} saved, but loading email branding failed:`, err);
    brand = { siteTitle: "Membership Portal", logoUrl: null };
  }

  try {
    const { subject, html } = applicationReceivedEmail({
      firstName: application.firstName,
      indexNumber: application.indexNumber,
      brand,
    });
    await sendEmail({
      to: application.email,
      subject,
      html,
      template: "application-received",
      entityType: "MembershipApplication",
      entityId: application.id,
    });
  } catch (err) {
    console.error(`[enroll] application ${application.id} saved, but confirmation email failed:`, err);
  }

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
      brand,
    });
    await Promise.all(
      notifyRecipients.map((admin) =>
        sendEmail({
          to: admin.email,
          subject: notice.subject,
          html: notice.html,
          template: "admin-new-application-notification",
          entityType: "MembershipApplication",
          entityId: application.id,
        }),
      ),
    );
  } catch (err) {
    console.error("[membership] failed to notify admins of new application:", err);
  }

  return application;
}

/**
 * An alumnus applying to become a current member again. Structurally almost
 * identical to submitApplication above — same PENDING queue, same admin
 * review, same emails — but the personal-identification fields (name,
 * email, phone) come from the submitting AlumniProfile rather than being
 * re-collected, and the application is tagged with submittedByAlumniId so
 * that approveApplication knows to link the resulting Member back to this
 * same alumnus once it's approved.
 */
export async function submitFurtherStudiesApplication(
  alumni: AlumniProfile,
  input: AlumniFurtherStudiesInput,
  profileImageUrl: string | null,
  medicalReportUrl: string | null,
): Promise<MembershipApplication> {
  let application: MembershipApplication;
  try {
    application = await withDbRetry(() =>
      db.membershipApplication.create({
        data: {
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          profileImageUrl: profileImageUrl ?? alumni.profileImageUrl,
          medicalReportUrl,
          phone: alumni.phone,
          email: alumni.email,
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
          submittedByAlumniId: alumni.id,
        },
      }),
    );
  } catch (err) {
    if (isUniqueConstraintError(err, "indexNumber")) throw new DuplicateIndexNumberError();
    throw err;
  }

  // Same reasoning as submitApplication: past this point the application is
  // saved, so nothing below may throw or block the confirmation.
  try {
    await db.notification.create({
      data: {
        type: "NEW_APPLICATION",
        title: `Further-studies application from alumnus ${alumni.fullName}`,
        link: `/admin/membership-applications/${application.id}`,
      },
    });
  } catch (err) {
    console.error(`[further-studies] application ${application.id} saved, but admin notification failed:`, err);
  }

  let brand;
  try {
    brand = await getEmailBrand();
  } catch (err) {
    console.error(`[further-studies] application ${application.id} saved, but loading email branding failed:`, err);
    brand = { siteTitle: "Membership Portal", logoUrl: null };
  }

  try {
    const { subject, html } = applicationReceivedEmail({
      firstName: application.firstName,
      indexNumber: application.indexNumber,
      brand,
    });
    await sendEmail({
      to: application.email,
      subject,
      html,
      template: "application-received",
      entityType: "MembershipApplication",
      entityId: application.id,
    });
  } catch (err) {
    console.error(`[further-studies] application ${application.id} saved, but confirmation email failed:`, err);
  }

  try {
    const notifyRecipients = await db.adminUser.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "MEMBERSHIP_OFFICER"] } },
      select: { email: true },
      take: 10,
    });
    const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/membership-applications/${application.id}`;
    const notice = adminNewApplicationNotificationEmail({
      applicantName: `${application.firstName} ${application.lastName} (alumnus)`,
      indexNumber: application.indexNumber,
      reviewUrl,
      brand,
    });
    await Promise.all(
      notifyRecipients.map((admin) =>
        sendEmail({
          to: admin.email,
          subject: notice.subject,
          html: notice.html,
          template: "admin-new-application-notification",
          entityType: "MembershipApplication",
          entityId: application.id,
        }),
      ),
    );
  } catch (err) {
    console.error("[further-studies] failed to notify admins of new application:", err);
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
    include: {
      reviewedBy: { select: { name: true, email: true } },
      member: true,
      submittedByAlumni: { select: { id: true, fullName: true, email: true } },
    },
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

  const application = await db.membershipApplication.findUnique({
    where: { id: applicationId },
    include: { member: true },
  });
  if (!application) throw new Error("Application not found.");
  if (application.status === ApplicationStatus.APPROVED) {
    throw new Error("This application has already been approved.");
  }

  // Reconciliation path: a Member row already exists for this application
  // (created by an earlier approval) even though its status has since
  // drifted away from APPROVED — the exact corrupted state
  // ApplicationAlreadyApprovedError now prevents going forward, but which
  // could already exist in the data from before that guard was added.
  // Treat this as correcting the application's status to match reality,
  // NOT as a fresh approval: creating a second Member would collide with
  // the existing one on indexNumber (the "already exists" error this is
  // fixing), and re-sending a temporary password would reset the login of
  // someone who may have already changed it.
  if (application.member) {
    await db.$transaction(async (tx) => {
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
          action: "RECONCILE_APPLICATION_STATUS",
          entityType: "MembershipApplication",
          entityId: applicationId,
          previousValue: { status: application.status },
          newValue: { status: "APPROVED", memberId: application.member!.id },
          note: note || "Status corrected to match an existing member account — no new account was created.",
        },
      });
    });
    return application.member;
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

    // A further-studies application (see submitFurtherStudiesApplication)
    // came FROM an existing alumnus — link the brand-new Member back to
    // that same AlumniProfile so they can log into both portals, in the
    // same transaction as creating it.
    let alumnusUserId: string | null = null;
    if (application.submittedByAlumniId) {
      const alumnus = await tx.alumniProfile.update({
        where: { id: application.submittedByAlumniId },
        data: { sourceMemberId: createdMember.id },
      });
      alumnusUserId = alumnus.userId;
    }

    // Provision the unified identity alongside the member record. Without
    // this, anyone approved from here would exist only in the legacy tables
    // and simply wouldn't be able to use /login — the new account would look
    // fine in the admin UI and fail at the one moment that matters.
    //
    // A returning alumnus already HAS a user, so they gain a role and a new
    // enrollment rather than a second identity.
    //
    // The admin login is deliberately walled off from this system (see
    // proxy.ts and auth/user.ts: admin auth never reads the unified tables,
    // by design) — but this lookup is a plain email match, and an admin's
    // own email is still just an email. It once matched an admin's existing
    // User row, silently attaching a Member and an ACTIVE enrollment to that
    // admin's identity — real production data this had to be cleaned up by
    // hand. An email that belongs to an admin login is therefore refused
    // outright rather than merged into, the same way a genuine duplicate
    // email is refused below.
    const existingUser = alumnusUserId
      ? await tx.user.findUnique({ where: { id: alumnusUserId }, include: { adminUser: true } })
      : await tx.user.findUnique({ where: { email: createdMember.email }, include: { adminUser: true } });

    if (existingUser?.adminUser) {
      throw new DuplicateEmailError();
    }

    const identityUser =
      existingUser ??
      (await tx.user.create({
        data: {
          email: createdMember.email,
          passwordHash: createdMember.passwordHash,
          firstName: createdMember.firstName,
          middleName: createdMember.middleName,
          lastName: createdMember.lastName,
          phone: createdMember.phone,
          mustChangePassword: createdMember.mustChangePassword,
        },
      }));

    await tx.member.update({ where: { id: createdMember.id }, data: { userId: identityUser.id } });

    await tx.userRole.upsert({
      where: { userId_role: { userId: identityUser.id, role: "MEMBER" } },
      update: {},
      create: { userId: identityUser.id, role: "MEMBER" },
    });

    // Close any earlier cycle so "current studies" stays unambiguous, then
    // record this one under its own index number.
    await tx.studentEnrollment.updateMany({
      where: { userId: identityUser.id, status: "ACTIVE" },
      data: { status: "GRADUATED", graduatedAt: new Date() },
    });

    await tx.studentEnrollment.create({
      data: {
        userId: identityUser.id,
        indexNumber: createdMember.indexNumber,
        applicationTrack: createdMember.applicationTrack,
        degreeCategory: createdMember.degreeCategory,
        programme: createdMember.programme,
        academicDepartment: createdMember.academicDepartment,
        level: createdMember.level,
        campus: createdMember.campus,
        hallOfAffiliation: createdMember.hallOfAffiliation,
        yearOfAdmission: createdMember.yearOfAdmission,
        expectedGraduationYear: createdMember.expectedGraduationYear,
        department: createdMember.department,
        specificSupportNeeds: createdMember.specificSupportNeeds,
        membershipType: createdMember.membershipType,
        status: "ACTIVE",
        applicationId: application.id,
      },
    });

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
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: member.email,
    subject,
    html,
    template: "application-approved",
    entityType: "Member",
    entityId: member.id,
  });

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
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: application.email,
    subject,
    html,
    template: "application-rejected",
    entityType: "MembershipApplication",
    entityId: application.id,
  });

  return application;
}

export async function requestApplicationChanges(params: {
  applicationId: string;
  adminId: string;
  note: string;
}): Promise<MembershipApplication> {
  const { applicationId, adminId, note } = params;
  const previous = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });
  // An approved application already has a live Member account tied to its
  // index number. Moving its status back to UNDER_REVIEW here wouldn't
  // touch that Member row at all — the person keeps logging in normally —
  // but it WOULD make the admin UI say "under review" for an account that
  // already exists, and a later re-approval attempt would then collide with
  // that same Member row on indexNumber and fail with a confusing
  // "already exists" error. See ApplicationAlreadyApprovedError.
  if (previous.status === ApplicationStatus.APPROVED) {
    throw new ApplicationAlreadyApprovedError();
  }

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

  const { subject, html } = applicationChangesRequestedEmail({
    firstName: application.firstName,
    adminNote: note,
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: application.email,
    subject,
    html,
    template: "application-changes-requested",
    entityType: "MembershipApplication",
    entityId: application.id,
  });

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
  // Same reasoning as requestApplicationChanges above — this covers the
  // UNDER_REVIEW and SUSPEND admin actions, both of which must not be
  // applied to an application that's already produced a Member account.
  if (previous.status === ApplicationStatus.APPROVED) {
    throw new ApplicationAlreadyApprovedError();
  }

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
    brand: await getEmailBrand(),
  });
  await sendEmail({
    to: member.email,
    subject,
    html,
    template: "password-reset",
    entityType: "Member",
    entityId: member.id,
  });
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

const EDITABLE_FIELD_LABELS: Record<(typeof EDITABLE_MEMBER_FIELDS)[number], string> = {
  phone: "Phone Number",
  residentialAddress: "Residential Address",
  region: "Region",
  emergencyContactName: "Emergency Contact Name",
  emergencyContactPhone: "Emergency Contact Phone",
  profileImageUrl: "Profile Picture",
};

export async function updateMemberProfile(
  memberId: string,
  updates: Partial<Pick<Member, (typeof EDITABLE_MEMBER_FIELDS)[number]>>,
): Promise<Member> {
  const before = await db.member.findUniqueOrThrow({ where: { id: memberId } });

  const safeUpdates: Record<string, unknown> = {};
  const changedFields: string[] = [];
  for (const field of EDITABLE_MEMBER_FIELDS) {
    if (field in updates && updates[field] !== before[field]) {
      safeUpdates[field] = updates[field];
      changedFields.push(EDITABLE_FIELD_LABELS[field]);
    }
  }

  const updated = await db.member.update({ where: { id: memberId }, data: safeUpdates });

  // Best-effort confirmation — a stalled/failed email must never make an
  // otherwise-successful profile update look like it failed.
  if (changedFields.length > 0) {
    try {
      const { subject, html } = profileUpdatedEmail({
        firstName: updated.firstName,
        changedFields,
        brand: await getEmailBrand(),
      });
      await sendEmail({
        to: updated.email,
        subject,
        html,
        template: "profile-updated",
        entityType: "Member",
        entityId: updated.id,
      });
    } catch (err) {
      console.error("[membership] failed to send profile-update confirmation email:", err);
    }
  }

  return updated;
}

export interface MemberListFilter {
  search?: string;
  academicDepartment?: string;
  programme?: string;
  membershipType?: string;
  gender?: string;
  applicationTrack?: string;
  campus?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: MemberSort;
}

export const MEMBER_SORT_OPTIONS = ["newest", "oldest", "name"] as const;
export type MemberSort = (typeof MEMBER_SORT_OPTIONS)[number];

const MEMBER_ORDER_BY: Record<MemberSort, Prisma.MemberOrderByWithRelationInput | Prisma.MemberOrderByWithRelationInput[]> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: [{ firstName: "asc" }, { lastName: "asc" }],
};

function buildMemberWhere(filter?: MemberListFilter): Prisma.MemberWhereInput {
  const where: Prisma.MemberWhereInput = {};
  const and: Prisma.MemberWhereInput[] = [];

  // A graduated member gets an AlumniProfile (see promoteMemberToAlumni) and
  // moves to the Alumni admin pages — the Members list is meant to show
  // current students, so once that promotion has happened the person should
  // no longer appear here at all, not even as a still-technically-a-Member
  // row. Their record itself is untouched; this only affects this listing.
  and.push({ alumniProfile: null });

  if (filter?.search) {
    and.push({
      OR: [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName: { contains: filter.search, mode: "insensitive" } },
        { indexNumber: { contains: filter.search, mode: "insensitive" } },
        { email: { contains: filter.search, mode: "insensitive" } },
      ],
    });
  }
  if (filter?.academicDepartment) and.push({ academicDepartment: filter.academicDepartment });
  if (filter?.programme) and.push({ programme: filter.programme });
  if (filter?.membershipType) and.push({ membershipType: filter.membershipType as MembershipType });
  if (filter?.gender) and.push({ gender: filter.gender as Gender });
  if (filter?.applicationTrack) and.push({ applicationTrack: filter.applicationTrack as ApplicationTrack });
  if (filter?.campus) and.push({ campus: filter.campus });
  if (filter?.status) and.push({ status: filter.status as MemberStatus });
  if (filter?.dateFrom) and.push({ createdAt: { gte: new Date(filter.dateFrom) } });
  if (filter?.dateTo) {
    const end = new Date(filter.dateTo);
    end.setHours(23, 59, 59, 999);
    and.push({ createdAt: { lte: end } });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export async function listMembers(filter?: MemberListFilter) {
  return db.member.findMany({
    where: buildMemberWhere(filter),
    orderBy: MEMBER_ORDER_BY[filter?.sort ?? "newest"],
  });
}

/** Distinct values currently in use, for populating the admin filter
 * dropdowns — reflects real data rather than a static list that could
 * drift out of sync with what members actually have on file. */
export async function getMemberFilterOptions() {
  const [departments, programmes, campuses] = await Promise.all([
    db.member.findMany({
      where: { academicDepartment: { not: null } },
      distinct: ["academicDepartment"],
      select: { academicDepartment: true },
      orderBy: { academicDepartment: "asc" },
    }),
    db.member.findMany({
      distinct: ["programme"],
      select: { programme: true },
      orderBy: { programme: "asc" },
    }),
    db.member.findMany({
      distinct: ["campus"],
      select: { campus: true },
      orderBy: { campus: "asc" },
    }),
  ]);
  return {
    departments: departments.map((d) => d.academicDepartment).filter((d): d is string => !!d),
    programmes: programmes.map((p) => p.programme),
    campuses: campuses.map((c) => c.campus),
  };
}

export async function deleteMember(params: { memberId: string; adminId: string; note?: string }): Promise<void> {
  const { memberId, adminId, note } = params;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });

  // Deleting only the member left its original application record behind
  // (same indexNumber, a unique column) — from the database's point of
  // view that "slot" was still taken, so the person couldn't submit a
  // genuinely new application with the same index number even though
  // their member account was gone. Removing the application too is what
  // actually frees them up to reapply. Order matters: the member row
  // references the application via a foreign key, so it must be deleted
  // first.
  const operations = [
    db.member.delete({ where: { id: memberId } }),
    ...(member.applicationId
      ? [db.membershipApplication.delete({ where: { id: member.applicationId } })]
      : []),
    db.auditLog.create({
      data: {
        adminId,
        action: "DELETE_MEMBER",
        entityType: "Member",
        entityId: memberId,
        previousValue: {
          firstName: member.firstName,
          lastName: member.lastName,
          indexNumber: member.indexNumber,
          email: member.email,
          applicationId: member.applicationId,
        },
        note: note || null,
      },
    }),
  ];

  await db.$transaction(operations);
}

/** Only rejected or suspended applications can be deleted this way — a
 * pending/under-review application is still an open decision the admin
 * needs to make, and an approved application is tied to a live member
 * account (delete the member instead, via deleteMember, which also cleans
 * up the underlying application). Restricting the status here prevents an
 * admin from accidentally deleting an application that still matters. */
export async function deleteApplication(params: { applicationId: string; adminId: string; note?: string }): Promise<void> {
  const { applicationId, adminId, note } = params;
  const application = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });

  if (application.status !== ApplicationStatus.REJECTED && application.status !== ApplicationStatus.SUSPENDED) {
    throw new Error("Only rejected or suspended applications can be deleted.");
  }

  await db.$transaction([
    db.membershipApplication.delete({ where: { id: applicationId } }),
    db.auditLog.create({
      data: {
        adminId,
        action: "DELETE_APPLICATION",
        entityType: "MembershipApplication",
        entityId: applicationId,
        previousValue: {
          firstName: application.firstName,
          lastName: application.lastName,
          indexNumber: application.indexNumber,
          email: application.email,
          status: application.status,
        },
        note: note || null,
      },
    }),
  ]);
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

/**
 * Admin correction of an existing member's own record — index number, name,
 * contact and academic details, everything memberAdminEditSchema covers.
 *
 * Separate from updateMemberProfile above: that one is the member's own
 * self-service update (a handful of contact fields, from their own
 * dashboard). This is the admin-side equivalent for fields a member can't
 * touch themselves — most importantly the index number, which occasionally
 * needs correcting after a typo at enrollment, and which staying wrong is
 * far more disruptive than a slow admin workflow to fix it.
 *
 * Does not touch status or graduatedAt — MemberStatusControl and
 * MarkGraduatedControl already own those, each with their own audit action
 * name, and folding them in here would blur that history. Does not touch
 * profileImageUrl or medicalReportUrl either: there is no admin re-upload
 * path yet, so those stay whatever the member's own application set them to.
 */
const ADMIN_EDITABLE_FIELD_LABELS: Record<string, string> = {
  indexNumber: "Index Number",
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Surname",
  email: "Email Address",
  phone: "Phone Number",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  membershipType: "Membership Type",
  applicationTrack: "Study Level (Track)",
  campus: "Campus",
  hallOfAffiliation: "Hall of Affiliation",
  degreeCategory: "Postgraduate Degree Category",
  academicDepartment: "Academic Department",
  programme: "Programme",
  level: "Level",
  yearOfAdmission: "Year of Admission",
  expectedGraduationYear: "Expected Graduation Year",
  department: "Category of Special Needs",
  specificSupportNeeds: "Specific Support Needs",
  residentialAddress: "Residential Address",
  region: "Region",
  emergencyContactName: "Emergency Contact Name",
  emergencyContactPhone: "Emergency Contact Phone",
};

export async function updateMemberAdmin(params: {
  memberId: string;
  adminId: string;
  updates: MemberAdminEditInput;
}): Promise<Member> {
  const { memberId, adminId, updates } = params;
  const before = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { alumniProfile: true },
  });

  const data = {
    indexNumber: updates.indexNumber,
    firstName: updates.firstName,
    middleName: updates.middleName || null,
    lastName: updates.lastName,
    email: updates.email,
    phone: updates.phone,
    dateOfBirth: updates.dateOfBirth instanceof Date ? updates.dateOfBirth : null,
    gender: updates.gender || null,
    membershipType: updates.membershipType || null,
    applicationTrack: updates.applicationTrack || null,
    campus: updates.campus,
    hallOfAffiliation: updates.hallOfAffiliation || null,
    degreeCategory: updates.degreeCategory || null,
    academicDepartment: updates.academicDepartment || null,
    programme: updates.programme,
    level: updates.level,
    yearOfAdmission: updates.yearOfAdmission,
    expectedGraduationYear: updates.expectedGraduationYear ?? null,
    department: updates.department,
    specificSupportNeeds: updates.specificSupportNeeds ?? [],
    residentialAddress: updates.residentialAddress || null,
    region: updates.region || null,
    emergencyContactName: updates.emergencyContactName || null,
    emergencyContactPhone: updates.emergencyContactPhone || null,
  };

  let updated: Member;
  try {
    // A graduated member's AlumniProfile was copied from their Member row
    // once, at promotion time (see promoteMemberToAlumni), and nothing kept
    // the two in sync after that — so without this, correcting a graduated
    // member's name here would leave the alumni directory and admin alumni
    // list showing the old, wrong details forever. Updating both together in
    // one transaction keeps them from being able to drift apart again.
    if (before.alumniProfile) {
      const profileId = before.alumniProfile.id;
      [updated] = await db.$transaction([
        db.member.update({ where: { id: memberId }, data }),
        db.alumniProfile.update({
          where: { id: profileId },
          data: {
            fullName: formatFullName(updates.firstName, updates.middleName, updates.lastName),
            email: updates.email,
            phone: updates.phone,
            programme: updates.programme,
          },
        }),
      ]);
    } else {
      updated = await db.member.update({ where: { id: memberId }, data });
    }
  } catch (err) {
    if (isUniqueConstraintError(err, "indexNumber")) throw new DuplicateIndexNumberError();
    // Covers both a collision on Member.email and, for a graduated member,
    // AlumniProfile.email — both fields are literally named "email", so
    // there's no way to tell which table's constraint fired from the error
    // alone, but the message is accurate either way.
    if (isUniqueConstraintError(err, "email")) throw new DuplicateEmailError();
    throw err;
  }

  // Only fields that actually changed go into the audit log, so a correction
  // to one field doesn't bury it under twenty unchanged ones.
  const beforeRaw = before as unknown as Record<string, unknown>;
  const updatedRaw = updated as unknown as Record<string, unknown>;
  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    const beforeVal = beforeRaw[key];
    const afterVal = updatedRaw[key];
    const normalize = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
    if (JSON.stringify(normalize(beforeVal)) !== JSON.stringify(normalize(afterVal))) {
      previousValue[key] = normalize(beforeVal);
      newValue[key] = normalize(afterVal);
    }
  }

  if (Object.keys(newValue).length > 0) {
    await db.auditLog.create({
      data: {
        adminId,
        action: "UPDATE_MEMBER_PROFILE_ADMIN",
        entityType: "Member",
        entityId: memberId,
        previousValue: previousValue as Prisma.InputJsonValue,
        newValue: newValue as Prisma.InputJsonValue,
      },
    });

    // A member should never learn their own details changed by noticing it
    // themselves — the same confirmation their own self-service edit sends
    // (see updateMemberProfile above), reused here so an admin correction
    // isn't silent just because the member didn't make it. Best-effort: a
    // stalled email must never make an otherwise-successful edit look like
    // it failed to the admin who made it.
    try {
      const changedFields = Object.keys(newValue).map((key) => ADMIN_EDITABLE_FIELD_LABELS[key] ?? key);
      const { subject, html } = profileUpdatedEmail({
        firstName: updated.firstName,
        changedFields,
        brand: await getEmailBrand(),
      });
      await sendEmail({
        to: updated.email,
        subject,
        html,
        template: "profile-updated",
        entityType: "Member",
        entityId: updated.id,
      });
    } catch (err) {
      console.error(`[update-member-admin] ${memberId} updated, but notification email failed:`, err);
    }
  }

  return updated;
}

/** Minimal member list for admin pickers (e.g. linking a Leadership team
 *  entry to the account that pays dues) — not the full record, just enough
 *  to identify someone in a dropdown. */
export async function listActiveMembersForLinking() {
  return db.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, indexNumber: true, firstName: true, middleName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}
