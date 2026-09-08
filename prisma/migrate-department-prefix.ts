/**
 * One-off data migration: strips the old "Department of " prefix from the
 * "academicDepartment" field on existing membership applications, members,
 * and unified student enrollments — e.g. "Department of Special Education"
 * -> "Special Education", matching the bare-name format the current
 * dropdown list (ACADEMIC_DEPARTMENTS / POSTGRAD_DEPARTMENTS) uses.
 *
 * Safe to run more than once: a row is only updated if stripping the
 * prefix actually changes its value.
 *
 * Run once, from the project root:
 *   npx dotenv -e .env -- npx tsx prisma/migrate-department-prefix.ts
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const PREFIX = "Department of ";

async function migrateDepartment(
  label: string,
  rows: { id: string; academicDepartment: string | null }[],
  updateOne: (id: string, academicDepartment: string) => Promise<unknown>,
) {
  let updated = 0;
  for (const row of rows) {
    if (!row.academicDepartment?.startsWith(PREFIX)) continue;
    const next = row.academicDepartment.slice(PREFIX.length);
    await updateOne(row.id, next);
    updated++;
  }
  console.log(`[${label}] academicDepartment: ${updated} of ${rows.length} rows updated.`);
}

async function main() {
  const applications = await db.membershipApplication.findMany({
    select: { id: true, academicDepartment: true },
  });
  await migrateDepartment("membership_applications", applications, (id, academicDepartment) =>
    db.membershipApplication.update({ where: { id }, data: { academicDepartment } }),
  );

  const members = await db.member.findMany({
    select: { id: true, academicDepartment: true },
  });
  await migrateDepartment("members", members, (id, academicDepartment) =>
    db.member.update({ where: { id }, data: { academicDepartment } }),
  );

  const enrollments = await db.studentEnrollment.findMany({
    select: { id: true, academicDepartment: true },
  });
  await migrateDepartment("student_enrollments", enrollments, (id, academicDepartment) =>
    db.studentEnrollment.update({ where: { id }, data: { academicDepartment } }),
  );

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
