import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { type AlumniProfile, AlumniStatus, Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import { alumniGraduationInviteEmail, alumniWelcomeEmail, alumniPasswordResetEmail } from "@/lib/email/templates";
import type { AlumniRegisterInput } from "@/lib/validations/alumni";
import { formatFullName } from "@/lib/format";
import {
  notifyAccountRemoved,
  notifyAlumniProfileUpdated,
  notifyAlumniStatusChange,
  notifyGraduationRecorded,
  notifyPasswordChanged,
  firstNameOf,
} from "@/lib/services/account-notification-service";

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

// A "forgot password" link resets an account that's already in active use —
// kept short deliberately, so a stale link sitting in an old inbox can't be
// used to hijack a working login much later.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// The graduation invite is different: it's the FIRST password this alumnus
// ever sets, for an account nobody is using yet, sent to someone who may not
// see their email again for weeks. 30 minutes was routinely expiring before
// people found the message. Generous rather than unlimited — an invite link
// that never expires is a permanent standing credential to a brand-new
// account if that one email is ever compromised or forwarded on.
const GRADUATION_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

  // A person can go through this twice: graduate, later re-enroll via the
  // alumni "continue your studies" flow (which links this same
  // AlumniProfile to their new Member via sourceMemberId — see
  // approveApplication), then graduate again. That's not a duplicate
  // account, it's the same alumnus's profile catching up to their second
  // graduation — refresh it in place instead of erroring. Any OTHER
  // existing profile with this email (not linked to the member currently
  // being promoted) is a genuine, unexpected duplicate and still blocked.
  if (existingByEmail && existingByEmail.sourceMemberId !== member.id) {
    throw new DuplicateAlumniEmailError();
  }

  const [, alumni] = await db.$transaction([
    db.member.update({ where: { id: memberId }, data: { graduatedAt: new Date() } }),
    existingByEmail
      ? db.alumniProfile.update({
          where: { id: existingByEmail.id },
          data: {
            fullName: formatFullName(member.firstName, member.middleName, member.lastName),
            phone: member.phone,
            profileImageUrl: member.profileImageUrl,
            graduationYear,
            programme: member.programme,
            status: AlumniStatus.ACTIVE,
          },
        })
      : db.alumniProfile.create({
          data: {
            fullName: formatFullName(member.firstName, member.middleName, member.lastName),
            email: member.email,
            phone: member.phone,
            profileImageUrl: member.profileImageUrl,
            graduationYear,
            programme: member.programme,
            mustSetPassword: true,
            directoryVisible: true,
            status: AlumniStatus.ACTIVE,
            sourceMemberId: member.id,
            userId: member.userId,
          },
        }),
  ]);

  // Keep the unified identity model in step. Graduating through this control
  // and graduating through the admin panel's Push to Alumni Archive have to
  // leave the same result behind — otherwise the two models drift, and the
  // person's standing depends on which button someone happened to press.
  if (member.userId) {
    const userId = member.userId;
    await db.$transaction([
      db.alumniProfile.update({ where: { id: alumni.id }, data: { userId } }),
      db.studentEnrollment.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "GRADUATED", graduatedAt: new Date() },
      }),
      db.userRole.upsert({
        where: { userId_role: { userId, role: "ALUMNI" } },
        update: {},
        create: { userId, role: "ALUMNI" },
      }),
      // Student standing ends at graduation; the alumni side takes over.
      db.userRole.deleteMany({ where: { userId, role: "MEMBER" } }),
    ]);
  }

  // A returning alumnus re-graduating already has a working password and
  // doesn't need a new invite — only send one the first time this profile
  // is created.
  if (!existingByEmail) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await db.alumniPasswordResetToken.create({
      data: { tokenHash, alumniId: alumni.id, expiresAt: new Date(Date.now() + GRADUATION_INVITE_TTL_MS) },
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
  } else {
    // No invite for a returning alumnus — but the graduation itself still
    // changed their account, so they still hear about it.
    await notifyGraduationRecorded({
      alumniId: alumni.id,
      email: alumni.email,
      firstName: member.firstName,
      graduationYear,
      programme: member.programme,
      studentMembershipClosed: false,
    });
  }

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
  const before = await db.alumniProfile.findUniqueOrThrow({
    where: { id: record.alumniId },
    select: { passwordHash: true, mustSetPassword: true },
  });
  const passwordHash = await hashPassword(newPassword);
  const [alumni] = await db.$transaction([
    db.alumniProfile.update({ where: { id: record.alumniId }, data: { passwordHash, mustSetPassword: false } }),
    db.alumniPasswordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // The same token flow sets a brand-new account's FIRST password (from the
  // graduation invite). That's not a change worth an alert; a reset is.
  const wasFirstPassword = !before.passwordHash || before.mustSetPassword;
  if (!wasFirstPassword) {
    await notifyPasswordChanged({
      portal: "Alumni",
      email: alumni.email,
      firstName: firstNameOf(alumni.fullName),
      entityType: "AlumniProfile",
      entityId: alumni.id,
    });
  }
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
  await notifyPasswordChanged({
    portal: "Alumni",
    email: alumni.email,
    firstName: firstNameOf(alumni.fullName),
    entityType: "AlumniProfile",
    entityId: alumni.id,
  });
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

const ALUMNI_FIELD_LABELS: Record<(typeof EDITABLE_ALUMNI_FIELDS)[number], string> = {
  fullName: "Full Name",
  phone: "Phone Number",
  profession: "Profession",
  currentLocation: "Current Location",
  bio: "Short Bio",
  willingToMentor: "Willing to Mentor",
  directoryVisible: "Alumni Directory Visibility",
  profileImageUrl: "Profile Picture",
};

export async function updateAlumniProfile(
  alumniId: string,
  updates: Partial<Pick<AlumniProfile, (typeof EDITABLE_ALUMNI_FIELDS)[number]>>,
): Promise<AlumniProfile> {
  const before = await db.alumniProfile.findUniqueOrThrow({ where: { id: alumniId } });

  const safeUpdates: Record<string, unknown> = {};
  const changedFields: string[] = [];
  for (const field of EDITABLE_ALUMNI_FIELDS) {
    if (!(field in updates)) continue;
    safeUpdates[field] = updates[field];
    // Blank and missing are the same thing on these optional fields.
    if ((updates[field] ?? null) !== (before[field] ?? null) && !(updates[field] === "" && before[field] === null)) {
      changedFields.push(ALUMNI_FIELD_LABELS[field]);
    }
  }

  const updated = await db.alumniProfile.update({ where: { id: alumniId }, data: safeUpdates });
  await notifyAlumniProfileUpdated({ alumni: updated, changedFields });
  return updated;
}

const CAREER_FIELD_LABELS = {
  profession: "Profession",
  currentPosition: "Current Position",
  currentOrganization: "Organisation",
  industry: "Industry",
  currentLocation: "Current Location",
  country: "Country",
  linkedinUrl: "LinkedIn Profile",
  websiteUrl: "Website",
} as const;

export type AlumniCareerUpdate = { [K in keyof typeof CAREER_FIELD_LABELS]: string | null };

/** The alumnus's own "Career Updates" page. */
export async function updateAlumniCareer(alumniId: string, updates: AlumniCareerUpdate): Promise<AlumniProfile> {
  const before = await db.alumniProfile.findUniqueOrThrow({ where: { id: alumniId } });
  const changedFields = (Object.keys(CAREER_FIELD_LABELS) as (keyof AlumniCareerUpdate)[])
    .filter((field) => (updates[field] ?? null) !== (before[field] ?? null))
    .map((field) => CAREER_FIELD_LABELS[field]);

  const updated = await db.alumniProfile.update({ where: { id: alumniId }, data: updates });
  await notifyAlumniProfileUpdated({ alumni: updated, changedFields });
  return updated;
}

export interface StudyRecord {
  id: string;
  indexNumber: string;
  programme: string;
  academicDepartment: string | null;
  level: string;
  campus: string;
  track: "UNDERGRADUATE" | "POSTGRADUATE" | null;
  yearOfAdmission: number;
  expectedGraduationYear: number | null;
  status: "ACTIVE" | "GRADUATED" | "SUSPENDED" | "INACTIVE";
  graduatedAt: Date | null;
}

/**
 * An alumnus's periods of study as the association holds them, for the
 * Academic Records page.
 *
 * The enrollment history (one row per period of study) is the complete
 * record wherever it exists. Accounts older than that history have only the
 * member record they graduated from, which stands in for it — never both,
 * which would list the same studies twice.
 */
export async function getAlumniStudyRecords(alumni: Pick<AlumniProfile, "id" | "userId" | "sourceMemberId">) {
  const [enrollments, sourceMember, furtherStudiesApplications] = await Promise.all([
    alumni.userId
      ? db.studentEnrollment.findMany({
          where: { userId: alumni.userId },
          orderBy: [{ yearOfAdmission: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    alumni.sourceMemberId ? db.member.findUnique({ where: { id: alumni.sourceMemberId } }) : Promise.resolve(null),
    db.membershipApplication.findMany({
      where: { submittedByAlumniId: alumni.id },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true, programme: true, level: true, indexNumber: true, submittedAt: true },
    }),
  ]);

  let records: StudyRecord[];
  if (enrollments.length > 0) {
    records = enrollments.map((e) => ({
      id: e.id,
      indexNumber: e.indexNumber,
      programme: e.programme,
      academicDepartment: e.academicDepartment,
      level: e.level,
      campus: e.campus,
      track: e.applicationTrack,
      yearOfAdmission: e.yearOfAdmission,
      expectedGraduationYear: e.expectedGraduationYear,
      status: e.status,
      graduatedAt: e.graduatedAt,
    }));
  } else if (sourceMember) {
    records = [
      {
        id: sourceMember.id,
        indexNumber: sourceMember.indexNumber,
        programme: sourceMember.programme,
        academicDepartment: sourceMember.academicDepartment,
        level: sourceMember.level,
        campus: sourceMember.campus,
        track: sourceMember.applicationTrack,
        yearOfAdmission: sourceMember.yearOfAdmission,
        expectedGraduationYear: sourceMember.expectedGraduationYear,
        status: sourceMember.graduatedAt ? "GRADUATED" : sourceMember.status,
        graduatedAt: sourceMember.graduatedAt,
      },
    ];
  } else {
    records = [];
  }

  return { records, furtherStudiesApplications };
}

/** Headline numbers for the Alumni Portal's network card. */
export async function getAlumniNetworkCounts() {
  const visible = { status: AlumniStatus.ACTIVE, directoryVisible: true };
  const [directoryCount, mentorCount] = await Promise.all([
    db.alumniProfile.count({ where: visible }),
    db.alumniProfile.count({ where: { ...visible, willingToMentor: true } }),
  ]);
  return { directoryCount, mentorCount };
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

export const ALUMNI_SORT_FIELDS = ["name", "graduationYear", "joined"] as const;
export type AlumniSortField = (typeof ALUMNI_SORT_FIELDS)[number];

const ALUMNI_ORDER_BY: Record<AlumniSortField, Prisma.AlumniProfileOrderByWithRelationInput> = {
  name: { fullName: "asc" },
  graduationYear: { graduationYear: "desc" },
  joined: { createdAt: "desc" },
};

export async function listAlumniForAdmin(filter?: { search?: string; sort?: AlumniSortField }) {
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
    // sourceMember.graduatedAt is what tells "graduated FROM this link" apart
    // from "currently ALSO a member via this link" — see describeAlumniSource.
    // The spotlight comes along so the list can show, at a glance, who is
    // public and who is actually featured on the site.
    include: {
      sourceMember: { select: { graduatedAt: true } },
      spotlight: { select: { published: true, displayOrder: true } },
    },
    orderBy: ALUMNI_ORDER_BY[filter?.sort ?? "joined"],
  });
}

export type AlumniSource = "graduated-member" | "currently-enrolled" | "self-registered";

/**
 * sourceMemberId alone can no longer tell "this profile was created by a
 * graduating member" apart from "this alumnus later re-enrolled and is
 * currently also a member" — both set the same field (see
 * AlumniProfile.sourceMemberId in the schema). The member's own
 * graduatedAt is what actually distinguishes them: set for the classic
 * graduation case, null while a further-studies member is still active.
 */
export function describeAlumniSource(alumni: { sourceMember: { graduatedAt: Date | null } | null }): AlumniSource {
  if (!alumni.sourceMember) return "self-registered";
  return alumni.sourceMember.graduatedAt ? "graduated-member" : "currently-enrolled";
}

export async function setAlumniStatus(params: { alumniId: string; status: AlumniStatus }): Promise<AlumniProfile> {
  const before = await db.alumniProfile.findUniqueOrThrow({ where: { id: params.alumniId }, select: { status: true } });
  const updated = await db.alumniProfile.update({ where: { id: params.alumniId }, data: { status: params.status } });
  await notifyAlumniStatusChange(updated, before.status, updated.status);
  return updated;
}

export async function deleteAlumni(params: {
  alumniId: string;
  adminId: string;
  note?: string;
  /** False when the caller sends its own, combined notice (see deleteUserAccount). */
  notify?: boolean;
}): Promise<void> {
  const { alumniId, adminId, note, notify = true } = params;
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

  if (notify) {
    await notifyAccountRemoved({
      recipient: { email: alumni.email, firstName: firstNameOf(alumni.fullName) },
      accountKind: "alumni",
      entityType: "AlumniProfile",
      entityId: alumniId,
    });
  }
}
