import "dotenv/config";

/**
 * GUARD: the test suite must never reach the production database.
 *
 * The service-layer tests exercise real code against a real Postgres — they
 * create, mutate and delete rows for real. Meanwhile this project's `.env`
 * deliberately points DATABASE_URL at PRODUCTION, because that is how
 * migrations get applied (see AGENTS.md). Together those two facts mean a
 * plain `npm run test` silently runs the whole suite against live data.
 *
 * That is not hypothetical. It has already happened: the suite was run with
 * only `.env` loaded, several tests timed out against the remote database
 * before their cleanup ran, and orphaned rows were left in production.
 *
 * Rather than refuse to start (which would also block the many tests that
 * never open a connection), this repoints DATABASE_URL at a dead address
 * whenever it isn't obviously local. Tests that don't touch the database keep
 * running; tests that do fail fast and locally, instead of writing to prod.
 */
const LOCAL_HOST_PATTERN = /@(localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)[:/]/i;

// An unroutable target whose database name doubles as the error message —
// a connection failure against it names its own fix.
const BLOCKED_URL =
  "postgresql://blocked:blocked@localhost:1/set_TEST_DATABASE_URL_to_a_local_db_to_run_these_tests";

if (process.env.TEST_DATABASE_URL) {
  // Applied before any test file imports src/lib/db, which reads DATABASE_URL
  // at module load. Vitest runs setupFiles first, so this wins.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!LOCAL_HOST_PATTERN.test(process.env.DATABASE_URL ?? "")) {
  const target = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : "(DATABASE_URL not set)";

  console.warn(
    [
      "",
      "  ⚠ Database-backed tests are disabled in this run.",
      "",
      `    DATABASE_URL points at ${target}, which is not a local database.`,
      "    Letting the suite run against it would mutate live data, so the",
      "    connection has been redirected to a dead address. Tests that don't",
      "    touch the database still run normally.",
      "",
      "    To run the full suite, start a local Postgres and point",
      "    TEST_DATABASE_URL at it:",
      "",
      "      docker run --rm -d --name portal-test-db -p 5432:5432 \\",
      "        -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=portal_test postgres:16",
      "",
      "      export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portal_test",
      "      npx dotenv -e /dev/null -- npx prisma migrate deploy",
      "      npm run test",
      "",
    ].join("\n"),
  );

  process.env.DATABASE_URL = BLOCKED_URL;
}
