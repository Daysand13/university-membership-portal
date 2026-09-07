/**
 * Stage 1 backfill for the unified identity model.
 *
 * Builds one User row per distinct human from the existing Member,
 * AlumniProfile and AdminUser records, mirrors each member's current
 * studies into a StudentEnrollment, and grants the matching roles.
 *
 * Deliberately idempotent: every write is keyed on something stable
 * (email for users, userId+role for roles, indexNumber for enrollments)
 * and skips what already exists, so re-running it after a partial failure
 * converges rather than duplicating. It also never writes to the legacy
 * columns those records authenticate with today — the old login path is
 * untouched by anything here.
 *
 * Run:  npx dotenv -e .env -- npx tsx prisma/backfill-unified-identity.ts
 *       (add --commit to actually write; defaults to a dry run)
 */
import { db } from "../src/lib/db";

const COMMIT = process.argv.includes("--commit");

function log(...args: unknown[]) {
  console.log(...args);
}

async function main() {
  log(COMMIT ? "=== BACKFILL (COMMITTING) ===" : "=== BACKFILL (DRY RUN — pass --commit to write) ===");

  const [members, alumni, admins] = await Promise.all([
    db.member.findMany({ include: { alumniProfile: true } }),
    db.alumniProfile.findMany(),
    db.adminUser.findMany(),
  ]);

  log(`source rows — members: ${members.length}, alumni: ${alumni.length}, admins: ${admins.length}`);

  // ---------------------------------------------------------------
  // Users, keyed by lowercased email so the same human recorded in two
  // tables collapses into one identity rather than two logins.
  // ---------------------------------------------------------------
  const planned = new Map<
    string,
    {
      email: string;
      passwordHash: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      phone: string | null;
      mustChangePassword: boolean;
      roles: Set<"MEMBER" | "ALUMNI" | "ADMIN">;
      memberId?: string;
      alumniId?: string;
      adminId?: string;
    }
  >();

  function upsertPlanned(email: string, seed: () => Omit<ReturnType<typeof Object>, never>) {
    void seed;
    return planned.get(email.trim().toLowerCase());
  }
  void upsertPlanned;

  for (const m of members) {
    const key = m.email.trim().toLowerCase();
    planned.set(key, {
      email: key,
      passwordHash: m.passwordHash,
      firstName: m.firstName,
      middleName: m.middleName,
      lastName: m.lastName,
      phone: m.phone,
      mustChangePassword: m.mustChangePassword,
      roles: new Set(["MEMBER"]),
      memberId: m.id,
    });
    // A graduated member already carries alumni standing.
    if (m.alumniProfile) planned.get(key)!.roles.add("ALUMNI");
  }

  for (const a of alumni) {
    const key = a.email.trim().toLowerCase();
    const existing = planned.get(key);
    if (existing) {
      existing.roles.add("ALUMNI");
      existing.alumniId = a.id;
      continue;
    }
    // Split a single fullName only for a self-registered alumnus, who has
    // no structured name anywhere else to draw on.
    const parts = a.fullName.trim().split(/\s+/);
    planned.set(key, {
      email: key,
      // An alumnus who never set a password can't be given a usable login
      // here — they keep the invite flow they already have.
      passwordHash: a.passwordHash ?? "",
      firstName: parts[0] ?? a.fullName,
      middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
      lastName: parts.length > 1 ? parts[parts.length - 1] : "",
      phone: a.phone,
      mustChangePassword: a.mustSetPassword,
      roles: new Set(["ALUMNI"]),
      alumniId: a.id,
    });
  }

  for (const ad of admins) {
    const key = ad.email.trim().toLowerCase();
    const existing = planned.get(key);
    if (existing) {
      existing.roles.add("ADMIN");
      existing.adminId = ad.id;
      continue;
    }
    const parts = ad.name.trim().split(/\s+/);
    planned.set(key, {
      email: key,
      passwordHash: ad.passwordHash,
      firstName: parts[0] ?? ad.name,
      middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
      lastName: parts.length > 1 ? parts[parts.length - 1] : "",
      phone: null,
      mustChangePassword: false,
      roles: new Set(["ADMIN"]),
      adminId: ad.id,
    });
  }

  log(`\nplanned users: ${planned.size}`);
  const roleTally = { MEMBER: 0, ALUMNI: 0, ADMIN: 0 };
  for (const p of planned.values()) for (const r of p.roles) roleTally[r]++;
  log("planned roles:", roleTally);

  const noPassword = [...planned.values()].filter((p) => !p.passwordHash);
  if (noPassword.length) {
    log(`\nNOTE: ${noPassword.length} user(s) have no password hash (alumni who never accepted their invite):`);
    noPassword.forEach((p) => log(`  ${p.email}`));
  }

  if (!COMMIT) {
    log("\nDry run complete — nothing written.");
    return;
  }

  // ---------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------
  let createdUsers = 0;
  let createdRoles = 0;
  let createdEnrollments = 0;

  for (const p of planned.values()) {
    const user = await db.user.upsert({
      where: { email: p.email },
      // Re-sync rather than skip. The legacy tables still own authentication
      // until the cutover, so anyone changing their password in the meantime
      // would leave a stale hash here and be locked out the moment auth moves
      // over — which is exactly what happened on the first run, caught only
      // because the verify step compares hashes. This script must therefore be
      // re-run immediately before the cutover to pick up any late changes.
      update: {
        passwordHash: p.passwordHash,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        phone: p.phone,
        mustChangePassword: p.mustChangePassword,
      },
      create: {
        email: p.email,
        passwordHash: p.passwordHash,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        phone: p.phone,
        mustChangePassword: p.mustChangePassword,
      },
    });
    createdUsers++;

    for (const role of p.roles) {
      await db.userRole.upsert({
        where: { userId_role: { userId: user.id, role } },
        update: {},
        create: { userId: user.id, role },
      });
      createdRoles++;
    }

    if (p.memberId) await db.member.update({ where: { id: p.memberId }, data: { userId: user.id } });
    if (p.alumniId) await db.alumniProfile.update({ where: { id: p.alumniId }, data: { userId: user.id } });
    if (p.adminId) await db.adminUser.update({ where: { id: p.adminId }, data: { userId: user.id } });

    // Mirror the member's current studies as their enrollment cycle.
    if (p.memberId) {
      const m = members.find((mm) => mm.id === p.memberId)!;
      const existing = await db.studentEnrollment.findUnique({ where: { indexNumber: m.indexNumber } });
      if (!existing) {
        await db.studentEnrollment.create({
          data: {
            userId: user.id,
            indexNumber: m.indexNumber,
            applicationTrack: m.applicationTrack,
            degreeCategory: m.degreeCategory,
            programme: m.programme,
            academicDepartment: m.academicDepartment,
            level: m.level,
            campus: m.campus,
            hallOfAffiliation: m.hallOfAffiliation,
            yearOfAdmission: m.yearOfAdmission,
            expectedGraduationYear: m.expectedGraduationYear,
            department: m.department,
            specificSupportNeeds: m.specificSupportNeeds,
            membershipType: m.membershipType,
            status: m.graduatedAt ? "GRADUATED" : m.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
            graduatedAt: m.graduatedAt,
            applicationId: m.applicationId,
          },
        });
        createdEnrollments++;
      }
    }
  }

  log(`\nwrote — users: ${createdUsers}, roles: ${createdRoles}, enrollments: ${createdEnrollments}`);

  // ---------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------
  const [userCount, roleCount, enrollCount, unlinkedMembers, unlinkedAlumni, unlinkedAdmins] = await Promise.all([
    db.user.count(),
    db.userRole.count(),
    db.studentEnrollment.count(),
    db.member.count({ where: { userId: null } }),
    db.alumniProfile.count({ where: { userId: null } }),
    db.adminUser.count({ where: { userId: null } }),
  ]);

  // Re-read from the database rather than trusting the in-memory snapshot:
  // the whole point is to catch a credential that moved underneath us while
  // this was running.
  const [freshMembers, freshAdmins] = await Promise.all([
    db.member.findMany({ include: { user: true } }),
    db.adminUser.findMany({ include: { user: true } }),
  ]);
  const credentialDrift = [
    ...freshMembers.filter((m) => !m.user || m.user.passwordHash !== m.passwordHash).map((m) => m.email),
    ...freshAdmins.filter((a) => !a.user || a.user.passwordHash !== a.passwordHash).map((a) => a.email),
  ];

  log("\n=== VERIFY ===");
  log(`users: ${userCount} (expected ${planned.size})`);
  log(`roles: ${roleCount}`);
  log(`enrollments: ${enrollCount} (expected ${members.length})`);
  log(`unlinked — members: ${unlinkedMembers}, alumni: ${unlinkedAlumni}, admins: ${unlinkedAdmins} (all should be 0)`);
  log(`credential drift: ${credentialDrift.length} (must be 0 — anyone listed here would be locked out at cutover)`);
  credentialDrift.forEach((e) => log(`  DRIFT: ${e}`));

  const ok =
    userCount === planned.size &&
    enrollCount === members.length &&
    unlinkedMembers === 0 &&
    unlinkedAlumni === 0 &&
    unlinkedAdmins === 0 &&
    credentialDrift.length === 0;
  log(ok ? "\nBACKFILL VERIFIED OK" : "\nMISMATCH — investigate before proceeding");
  if (!ok) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
