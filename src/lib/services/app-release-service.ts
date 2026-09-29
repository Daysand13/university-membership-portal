import "server-only";
import { db } from "@/lib/db";
import type { AdminUser } from "@/generated/prisma/client";
import { SHA256_PATTERN, VERSION_PATTERN } from "@/lib/app-release";

/**
 * Releases of the Android app.
 *
 * The app is not on Google Play, so the association publishes its own
 * builds and phones check here for a newer one. That makes this table part
 * of the app's security boundary rather than a list of downloads: whatever
 * is published here is what every phone will fetch and offer to install.
 *
 * Two rules it enforces, both learned the hard way by everyone who has
 * ever shipped an APK:
 *
 *  - **Build numbers only go up.** Android refuses to install over a newer
 *    build, so publishing a lower one produces an update that every phone
 *    downloads and then fails to install, for ever.
 *  - **A release is created before it is offered.** Publishing is a second,
 *    deliberate step, so a half-filled row is never handed to a thousand
 *    phones.
 */

export class ReleaseError extends Error {}

export interface ReleaseInput {
  version: string;
  buildNumber: number;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  changelog: string;
  minimumBuild: number;
  minAndroidSdk: number;
}

function check(input: ReleaseInput): void {
  if (!VERSION_PATTERN.test(input.version)) {
    throw new ReleaseError("A version looks like 1.4.0 — three numbers, nothing else.");
  }
  if (!SHA256_PATTERN.test(input.sha256)) {
    throw new ReleaseError("That SHA-256 isn't 64 hexadecimal characters. Copy it from the build output.");
  }
  if (!/^https:\/\//i.test(input.apkUrl)) {
    throw new ReleaseError("The APK address has to be https, so the download can't be tampered with on the way.");
  }
  if (input.buildNumber < 1) throw new ReleaseError("A build number starts at 1.");
  if (input.sizeBytes < 1) throw new ReleaseError("Give the file's size in bytes, so the app can show a download size.");
  if (input.minimumBuild > input.buildNumber) {
    // Otherwise every phone, including one on this very build, is told it
    // is no longer supported — with nothing new to install.
    throw new ReleaseError("The minimum supported build can't be higher than this release's own build number.");
  }
  if (!input.changelog.trim()) {
    throw new ReleaseError("Say what changed. It is what somebody reads before deciding to update.");
  }
}

export async function createRelease(input: ReleaseInput, admin: Pick<AdminUser, "id">) {
  check(input);

  const highest = await db.appRelease.findFirst({ orderBy: { buildNumber: "desc" }, select: { buildNumber: true } });
  if (highest && input.buildNumber <= highest.buildNumber) {
    throw new ReleaseError(
      `Build ${input.buildNumber} is not newer than ${highest.buildNumber}. Android will not install over a newer build, so this would download and fail on every phone.`,
    );
  }

  const clash = await db.appRelease.findFirst({
    where: { OR: [{ version: input.version }, { buildNumber: input.buildNumber }] },
    select: { version: true },
  });
  if (clash) throw new ReleaseError(`Version ${clash.version} already exists.`);

  const release = await db.appRelease.create({
    data: { ...input, published: false, publishedById: admin.id },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "CREATE_APP_RELEASE",
      entityType: "AppRelease",
      entityId: release.id,
      newValue: { version: release.version, buildNumber: release.buildNumber },
    },
  });

  return release;
}

/**
 * Offering a release to phones, or taking it back.
 *
 * Taking one back does not un-install it from anybody — it only stops it
 * being offered to phones that have not taken it yet, which is the most
 * that can be done once an APK is out.
 */
export async function setReleasePublished(params: {
  id: string;
  published: boolean;
  admin: Pick<AdminUser, "id">;
}) {
  const release = await db.appRelease.findUnique({ where: { id: params.id } });
  if (!release) throw new ReleaseError("That release no longer exists.");

  await db.appRelease.update({ where: { id: params.id }, data: { published: params.published } });
  await db.auditLog.create({
    data: {
      adminId: params.admin.id,
      action: params.published ? "PUBLISH_APP_RELEASE" : "UNPUBLISH_APP_RELEASE",
      entityType: "AppRelease",
      entityId: release.id,
      newValue: { version: release.version, published: params.published },
    },
  });
}

export async function listReleases() {
  return db.appRelease.findMany({
    orderBy: { buildNumber: "desc" },
    include: { publishedBy: { select: { name: true } } },
  });
}
