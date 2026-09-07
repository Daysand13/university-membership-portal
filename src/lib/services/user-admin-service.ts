import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { getEmailBrand } from "@/lib/services/content-service";
import { alumniGraduationInviteEmail } from "@/lib/email/templates";
import { formatFullName } from "@/lib/format";
import { deleteMember } from "@/lib/services/membership-service";
import { deleteAlumni } from "@/lib/services/alumni-service";
import { Prisma, type UserRoleName } from "@/generated/prisma/client";

/**
 * The admin "superpower" operations — the deliberate, audited overrides that
 * let staff fix a real person's standing when the self-serve flows can't.
 *
 * Every operation here writes to BOTH identity models: the unified
 * User/UserRole/StudentEnrollment tables and the legacy Member/AlumniProfile
 * records that still back authentication and most of the admin UI. Until the
 * legacy columns are retired, an action that updated only one side would
 * quietly desync the two — which is the same class of bug as the application
 * status drift that let someone log in while their application still read
 * "under review". Each one is therefore a single transaction across both.
 */

export class UserAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAdminError";
  }
}

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // matches the graduation invite window

export interface UserMatrixFilter {
  search?: string;
  role?: UserRoleName;
}

/**
 * The user status matrix: one row per human, with every standing they hold.
 * Searchable by name, email, or any index number they have ever been issued
 * — including a previous one, since an admin looking someone up is often
 * holding an old record.
 */
export async function listUsersForMatrix(filter?: UserMatrixFilter) {
  const search = filter?.search?.trim();

  return db.user.findMany({
    where: {
      ...(filter?.role ? { roles: { some: { role: filter.role } } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { enrollments: { some: { indexNumber: { contains: search, mode: "insensitive" } } } },
              { member: { indexNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      roles: true,
      enrollments: { orderBy: { createdAt: "desc" } },
      member: { select: { id: true, indexNumber: true, status: true, graduatedAt: true } },
      alumniProfile: { select: { id: true, graduationYear: true, status: true } },
      adminUser: { select: { id: true, role: true, isActive: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });
}

export type UserMatrixRow = Awaited<ReturnType<typeof listUsersForMatrix>>[number];

/**
 * Push to Alumni Archive — ends the person's active studies and gives them
 * alumni standing, in one audited move.
 *
 * Distinct from the per-member "mark as graduated" control in that it works
 * from the unified user, closes the enrollment cycle as well as the member
 * record, and is safe to run on someone who already has an alumni profile
 * (it refreshes rather than failing, the same way re-graduation does).
 */
export async function pushToAlumniArchive(params: {
  userId: string;
  graduationYear: number;
  adminId: string;
  inviteBaseUrl: string;
}) {
  const { userId, graduationYear, adminId, inviteBaseUrl } = params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: true, alumniProfile: true, enrollments: true, roles: true },
  });
  if (!user) throw new UserAdminError("That account no longer exists.");
  if (!user.member) {
    throw new UserAdminError("This person has no student record to archive. Use Grant Dual Status instead.");
  }

  const member = user.member;
  const fullName = formatFullName(member.firstName, member.middleName, member.lastName);
  const alreadyAlumni = Boolean(user.alumniProfile);

  // An alumni profile is keyed on email; if one exists under this address but
  // belongs to a different account, stop rather than silently reassigning it.
  if (!alreadyAlumni) {
    const clash = await db.alumniProfile.findUnique({ where: { email: user.email } });
    if (clash) {
      throw new UserAdminError("An alumni account already exists with this email address under a different user.");
    }
  }

  const graduatedAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.member.update({
      where: { id: member.id },
      data: { graduatedAt, status: "INACTIVE" },
    });

    // Close every still-open enrollment cycle, not just one: the point of
    // archiving is that they are no longer an active student anywhere.
    await tx.studentEnrollment.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "GRADUATED", graduatedAt },
    });

    if (user.alumniProfile) {
      await tx.alumniProfile.update({
        where: { id: user.alumniProfile.id },
        data: { graduationYear, programme: member.programme, status: "ACTIVE", userId },
      });
    } else {
      await tx.alumniProfile.create({
        data: {
          fullName,
          email: user.email,
          phone: member.phone,
          profileImageUrl: member.profileImageUrl,
          graduationYear,
          programme: member.programme,
          mustSetPassword: false,
          directoryVisible: true,
          status: "ACTIVE",
          sourceMemberId: member.id,
          userId,
        },
      });
    }

    await tx.userRole.upsert({
      where: { userId_role: { userId, role: "ALUMNI" } },
      update: {},
      create: { userId, role: "ALUMNI" },
    });

    // Student standing ends with the archive — they keep the login and the
    // alumni side, but not access to the member portal.
    await tx.userRole.deleteMany({ where: { userId, role: "MEMBER" } });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "PUSH_TO_ALUMNI_ARCHIVE",
        entityType: "User",
        entityId: userId,
        previousValue: { roles: user.roles.map((r) => r.role), memberStatus: member.status },
        newValue: { roles: ["ALUMNI"], graduationYear, alumniExisted: alreadyAlumni },
      },
    });
  });

  // Someone who already had a working alumni login doesn't need an invite —
  // sending one would reset a password they're actively using.
  if (!alreadyAlumni) {
    try {
      const profile = await db.alumniProfile.findUnique({ where: { userId } });
      if (profile) {
        const rawToken = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        await db.alumniPasswordResetToken.create({
          data: { tokenHash, alumniId: profile.id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
        });
        const { subject, html } = alumniGraduationInviteEmail({
          firstName: member.firstName,
          setPasswordUrl: `${inviteBaseUrl}?token=${rawToken}`,
          brand: await getEmailBrand(),
        });
        await sendEmail({
          to: user.email,
          subject,
          html,
          template: "alumni-graduation-invite",
          entityType: "AlumniProfile",
          entityId: profile.id,
        });
      }
    } catch (err) {
      // The archive itself already succeeded — a failed invite must not undo
      // it or report failure, or an admin would retry and double-archive.
      console.error("[push-to-alumni-archive] archived, but invite email failed:", err);
    }
  }
}

/**
 * Grant Dual Status — attaches a standing the person is entitled to but never
 * acquired through the normal route.
 *
 * This is Scenario D: someone who graduated before the portal existed signs
 * up as an ordinary member, and staff recognise their history. Granting
 * ALUMNI creates the missing profile; granting MEMBER only re-attaches the
 * role to an existing student record, because conjuring a member account with
 * no enrollment behind it would put someone in the members list with no index
 * number or programme.
 */
export async function grantDualStatus(params: {
  userId: string;
  role: Extract<UserRoleName, "MEMBER" | "ALUMNI">;
  graduationYear?: number;
  adminId: string;
}) {
  const { userId, role, graduationYear, adminId } = params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: true, alumniProfile: true, roles: true, enrollments: true },
  });
  if (!user) throw new UserAdminError("That account no longer exists.");

  if (user.roles.some((r) => r.role === role)) {
    throw new UserAdminError(`This account already has ${role === "ALUMNI" ? "alumni" : "member"} standing.`);
  }

  if (role === "MEMBER" && !user.member) {
    throw new UserAdminError(
      "There's no student record to attach. Use Approve New Enrollment Cycle to give them an index number first.",
    );
  }

  if (role === "ALUMNI" && !user.alumniProfile) {
    const clash = await db.alumniProfile.findUnique({ where: { email: user.email } });
    if (clash) {
      throw new UserAdminError("An alumni account already exists with this email address under a different user.");
    }
    if (!graduationYear) {
      throw new UserAdminError("A graduation year is required to grant alumni standing.");
    }
  }

  await db.$transaction(async (tx) => {
    if (role === "ALUMNI" && !user.alumniProfile) {
      await tx.alumniProfile.create({
        data: {
          fullName: formatFullName(user.firstName, user.middleName, user.lastName),
          email: user.email,
          phone: user.phone ?? user.member?.phone ?? "",
          graduationYear: graduationYear!,
          programme: user.member?.programme ?? user.enrollments[0]?.programme ?? "Not recorded",
          mustSetPassword: false,
          directoryVisible: true,
          status: "ACTIVE",
          userId,
        },
      });
    }

    if (role === "MEMBER" && user.member) {
      // Re-activating student standing that was previously ended.
      await tx.member.update({ where: { id: user.member.id }, data: { status: "ACTIVE" } });
    }

    await tx.userRole.upsert({
      where: { userId_role: { userId, role } },
      update: {},
      create: { userId, role },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "GRANT_DUAL_STATUS",
        entityType: "User",
        entityId: userId,
        previousValue: { roles: user.roles.map((r) => r.role) },
        newValue: { granted: role, graduationYear: graduationYear ?? null },
      },
    });
  });
}

/**
 * Approve New Enrollment Cycle — links a NEW index number to an existing
 * account for someone returning to study.
 *
 * The new cycle is a new row; the previous one is closed rather than
 * overwritten, so the person's earlier studies stay on the record and the new
 * index number never collides with the old one. This is the admin-side
 * counterpart to the alumni "Continue Your Studies" form, for when staff are
 * entering the details themselves.
 */
export async function approveNewEnrollmentCycle(params: {
  userId: string;
  indexNumber: string;
  programme: string;
  level: string;
  campus: string;
  department: string;
  academicDepartment?: string | null;
  applicationTrack?: "UNDERGRADUATE" | "POSTGRADUATE" | null;
  yearOfAdmission: number;
  adminId: string;
}) {
  const { userId, adminId, ...cycle } = params;
  const indexNumber = cycle.indexNumber.trim();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: true, roles: true, enrollments: true },
  });
  if (!user) throw new UserAdminError("That account no longer exists.");

  // The index number must be free across BOTH models — an existing member or
  // application holding it would collide the moment this is approved.
  const [enrollClash, memberClash] = await Promise.all([
    db.studentEnrollment.findUnique({ where: { indexNumber } }),
    db.member.findUnique({ where: { indexNumber } }),
  ]);
  if (enrollClash && enrollClash.userId !== userId) {
    throw new UserAdminError("That index number is already assigned to another account.");
  }
  if (enrollClash) {
    throw new UserAdminError("This account already has an enrollment with that index number.");
  }
  if (memberClash && memberClash.userId !== userId) {
    throw new UserAdminError("That index number already belongs to another member.");
  }

  await db.$transaction(async (tx) => {
    // Close any cycle still open, so "current studies" stays unambiguous.
    await tx.studentEnrollment.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "GRADUATED", graduatedAt: new Date() },
    });

    await tx.studentEnrollment.create({
      data: {
        userId,
        indexNumber,
        programme: cycle.programme,
        level: cycle.level,
        campus: cycle.campus,
        department: cycle.department,
        academicDepartment: cycle.academicDepartment ?? null,
        applicationTrack: cycle.applicationTrack ?? null,
        yearOfAdmission: cycle.yearOfAdmission,
        status: "ACTIVE",
      },
    });

    // Keep the legacy member record — which still backs the member portal and
    // the members list — pointing at the new cycle.
    if (user.member) {
      await tx.member.update({
        where: { id: user.member.id },
        data: {
          indexNumber,
          programme: cycle.programme,
          level: cycle.level,
          campus: cycle.campus,
          department: cycle.department,
          academicDepartment: cycle.academicDepartment ?? null,
          applicationTrack: cycle.applicationTrack ?? null,
          yearOfAdmission: cycle.yearOfAdmission,
          status: "ACTIVE",
          graduatedAt: null,
        },
      });
    }

    await tx.userRole.upsert({
      where: { userId_role: { userId, role: "MEMBER" } },
      update: {},
      create: { userId, role: "MEMBER" },
    });

    await tx.auditLog.create({
      data: {
        adminId,
        action: "APPROVE_NEW_ENROLLMENT_CYCLE",
        entityType: "User",
        entityId: userId,
        previousValue: {
          previousIndexNumber: user.member?.indexNumber ?? null,
          openCycles: user.enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.indexNumber),
        },
        newValue: { indexNumber, programme: cycle.programme, level: cycle.level } as Prisma.InputJsonValue,
      },
    });
  });
}

/**
 * Removes a person's presence from the unified identity model entirely —
 * their User row, every role, and every enrollment cycle.
 *
 * Exists for exactly the situation that motivated it: an admin's own
 * account got a stray Member and StudentEnrollment attached (see the fix in
 * approveApplication for how), and deleting the Member through the ordinary
 * tool didn't touch the identity-layer rows left behind — they kept
 * appearing in the matrix with no way to remove them.
 *
 * If a real Member or AlumniProfile is still attached, this delegates to
 * the existing, already-audited deleteMember / deleteAlumni rather than
 * reimplementing that logic — this is "remove someone from the identity
 * system," not a second, cruder path to the same deletions those already
 * do carefully (freeing their index number, deciding what happens to their
 * application, sending no surprise emails).
 *
 * An admin login (AdminUser) is deliberately left alone. Deleting the User
 * row only detaches it — the FK is ON DELETE SET NULL — because admin auth
 * never reads these tables to begin with (see proxy.ts). Removing someone's
 * ADMIN role or admin account is a separate, more sensitive action with its
 * own tooling, and doesn't belong behind a matrix cleanup button.
 */
export async function deleteUserAccount(params: { userId: string; adminId: string }) {
  const { userId, adminId } = params;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: true, alumniProfile: true, adminUser: true, roles: true, enrollments: true },
  });
  if (!user) throw new UserAdminError("That account no longer exists.");

  const summary = {
    email: user.email,
    roles: user.roles.map((r) => r.role),
    hadMember: Boolean(user.member),
    hadAlumniProfile: Boolean(user.alumniProfile),
    stillHasAdminLogin: Boolean(user.adminUser),
    enrollments: user.enrollments.map((e) => e.indexNumber),
  };

  if (user.member) {
    await deleteMember({ memberId: user.member.id, adminId, note: "Removed via Delete Account in the user matrix." });
  }
  if (user.alumniProfile) {
    await deleteAlumni({
      alumniId: user.alumniProfile.id,
      adminId,
      note: "Removed via Delete Account in the user matrix.",
    });
  }

  await db.$transaction([
    db.studentEnrollment.deleteMany({ where: { userId } }),
    db.userRole.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
    db.auditLog.create({
      data: {
        adminId,
        action: "DELETE_USER_ACCOUNT",
        entityType: "User",
        entityId: userId,
        previousValue: summary as Prisma.InputJsonValue,
      },
    }),
  ]);
}
