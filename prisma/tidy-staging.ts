import { db } from "../src/lib/db";

/**
 * Clears the throwaway rows the test suite leaves in the staging branch.
 *
 * The database-backed tests create real applications, members and alumni
 * and delete them again at the end — but a run that times out or is
 * interrupted never reaches its cleanup, and the rows stay. Harmless on a
 * branch, untidy over time, and confusing to anybody reading staging as if
 * it were a copy of the real register.
 *
 * It only ever touches rows the tests themselves made: addresses beginning
 * "test-" and the named throwaway admins. Run with:
 *
 *   npx dotenv -e .env.staging.local -- npx tsx prisma/tidy-staging.ts
 *
 * It refuses to run anywhere but the staging branch.
 */

const STAGING_HOST_MARKER = "ep-super-cherry";

const TEST_ADMINS = [
  "vitest-admin@example.com",
  "vitest-admin-membership@example.com",
  "vitest-admin-alumni@example.com",
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url ? new URL(url).host : "(not set)";

  if (!host.includes(STAGING_HOST_MARKER)) {
    console.error(`Refusing to run: DATABASE_URL points at ${host}, which is not the staging branch.`);
    process.exit(1);
  }

  const where = { email: { startsWith: "test-" } };
  const [apps, members, alumni, admins] = await Promise.all([
    db.membershipApplication.count({ where }),
    db.member.count({ where }),
    db.alumniProfile.count({ where }),
    db.adminUser.count({ where: { email: { in: TEST_ADMINS } } }),
  ]);

  console.log(`staging (${host}) holds:`);
  console.log(`  test applications: ${apps}`);
  console.log(`  test members     : ${members}`);
  console.log(`  test alumni      : ${alumni}`);
  console.log(`  throwaway admins : ${admins}`);

  if (process.argv.includes("--delete")) {
    // Members first: an application is referenced by the member made from it.
    const removedMembers = await db.member.deleteMany({ where });
    const removedAlumni = await db.alumniProfile.deleteMany({ where });
    const removedApps = await db.membershipApplication.deleteMany({ where });
    const removedAdmins = await db.adminUser.deleteMany({ where: { email: { in: TEST_ADMINS } } });
    console.log("\nremoved:");
    console.log(`  members     : ${removedMembers.count}`);
    console.log(`  alumni      : ${removedAlumni.count}`);
    console.log(`  applications: ${removedApps.count}`);
    console.log(`  admins      : ${removedAdmins.count}`);
  } else {
    console.log("\nNothing removed. Pass --delete to clear them.");
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
