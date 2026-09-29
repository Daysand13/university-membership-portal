import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ReleaseError, createRelease, listReleases, setReleasePublished } from "@/lib/services/app-release-service";

/**
 * Publishing a build of the Android app.
 *
 * The app is not on Google Play, so whatever is recorded here is what
 * every phone downloads and offers to install. The rules below are the
 * ones that would otherwise produce an update that a thousand phones
 * fetch and then fail on — or, worse, one that locks everybody out.
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

const admin = { id: "" };
const made: string[] = [];

function release(overrides: Partial<Parameters<typeof createRelease>[0]> = {}) {
  return {
    version: "9.0.0",
    buildNumber: 900_000,
    apkUrl: "https://files.example.test/assn.apk",
    sha256: "a".repeat(64),
    sizeBytes: 30_000_000,
    changelog: "Faster news feed.",
    minimumBuild: 0,
    minAndroidSdk: 26,
    ...overrides,
  };
}

suite("recording a build of the app", () => {
  afterAll(async () => {
    if (made.length) await db.appRelease.deleteMany({ where: { id: { in: made } } });
    if (admin.id) {
      await db.auditLog.deleteMany({ where: { adminId: admin.id } });
      await db.adminUser.deleteMany({ where: { id: admin.id } });
    }
  });

  it("sets up a throwaway administrator", async () => {
    const row = await db.adminUser.upsert({
      where: { email: "vitest-admin-releases@example.com" },
      update: {},
      create: {
        name: "Vitest Releases",
        email: "vitest-admin-releases@example.com",
        passwordHash: "not-used-in-this-test",
        role: "SUPER_ADMIN",
      },
    });
    admin.id = row.id;
    expect(admin.id).toBeTruthy();
  });

  it("refuses a build number that is not newer than the last", async () => {
    // Android will not install over a newer build, so this would be an
    // update every phone downloads and then fails on, for ever.
    const highest = await db.appRelease.findFirst({ orderBy: { buildNumber: "desc" } });
    // Well above 1, so "one lower" is still a valid build number and the
    // check being tested is the one that fires.
    const at = Math.max(900_000, (highest?.buildNumber ?? 0) + 1);

    const first = await createRelease(release({ buildNumber: at, version: `9.0.${at % 1000}` }), admin);
    made.push(first.id);

    await expect(
      createRelease(release({ buildNumber: at, version: `9.1.${at % 1000}` }), admin),
    ).rejects.toBeInstanceOf(ReleaseError);
    await expect(
      createRelease(release({ buildNumber: at - 1, version: `9.2.${at % 1000}` }), admin),
    ).rejects.toThrow(/not newer/i);
  });

  it("refuses a minimum higher than the release itself", async () => {
    // Otherwise every phone — including one already on this build — is
    // told it is no longer supported, with nothing new to install.
    await expect(
      createRelease(release({ buildNumber: 950_001, version: "9.5.1", minimumBuild: 999_999 }), admin),
    ).rejects.toThrow(/can't be higher/i);
  });

  it("insists the download address is https", async () => {
    await expect(
      createRelease(release({ buildNumber: 950_002, version: "9.5.2", apkUrl: "http://files.example.test/a.apk" }), admin),
    ).rejects.toThrow(/https/i);
  });

  it("checks the hash is a hash before a phone ever relies on it", async () => {
    await expect(
      createRelease(release({ buildNumber: 950_003, version: "9.5.3", sha256: "nope" }), admin),
    ).rejects.toThrow(/64 hexadecimal/i);
  });

  it("wants a version that looks like a version, and words that mean something", async () => {
    await expect(
      createRelease(release({ buildNumber: 950_004, version: "v9.5.4" }), admin),
    ).rejects.toThrow(/1\.4\.0/);
    await expect(
      createRelease(release({ buildNumber: 950_005, version: "9.5.5", changelog: "   " }), admin),
    ).rejects.toThrow(/what changed/i);
  });

  it("does not offer a new build to anybody until it is published", async () => {
    const created = await createRelease(release({ buildNumber: 960_000, version: "9.6.0" }), admin);
    made.push(created.id);
    expect(created.published).toBe(false);

    await setReleasePublished({ id: created.id, published: true, admin });
    const after = (await listReleases()).find((row) => row.id === created.id);
    expect(after?.published).toBe(true);

    // And it can be taken back — which stops it being offered to anybody
    // who has not taken it yet, and nothing more.
    await setReleasePublished({ id: created.id, published: false, admin });
    const withdrawn = (await listReleases()).find((row) => row.id === created.id);
    expect(withdrawn?.published).toBe(false);
  });
});
