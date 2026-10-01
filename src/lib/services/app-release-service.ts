import "server-only";
import { db } from "@/lib/db";
import type { AdminUser } from "@/generated/prisma/client";
import { SHA256_PATTERN, VERSION_PATTERN } from "@/lib/app-release";
import {
  buildPublicUrl,
  extractObjectKeyFromPublicUrl,
  getObjectMetadata,
  getPresignedUploadUrl,
  isR2Configured,
  R2_PREFIXES,
} from "@/lib/storage/r2";
import { sanitizeFilenameStem } from "@/lib/storage/validation";

/** What Android expects an APK to be served as. */
export const APK_CONTENT_TYPE = "application/vnd.android.package-archive";

/** Comfortably above a real build (about 100MB), well below anything silly. */
export const MAX_APK_BYTES = 250 * 1024 * 1024;

/**
 * A place in the association's storage for a new build, and its address.
 *
 * The file goes straight from the administrator's browser to storage, with
 * a short-lived signed address — a 100MB APK cannot pass through the
 * website's server, which refuses requests over 4.5MB. The object name is
 * made here, never taken from the browser, so nobody can choose where in
 * the bucket to write. Before this existed, recording a release meant
 * somebody with the storage keys uploading the file by hand.
 */
export async function requestApkUpload(params: {
  filename: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; apkUrl: string; contentType: string }> {
  if (!isR2Configured()) throw new ReleaseError("File storage isn't set up on this site, so a build can't be uploaded here.");
  if (!/\.apk$/i.test(params.filename)) throw new ReleaseError("Choose the .apk file that EAS built.");
  if (!Number.isFinite(params.fileSize) || params.fileSize < 1) throw new ReleaseError("That file appears to be empty.");
  if (params.fileSize > MAX_APK_BYTES) {
    throw new ReleaseError(`That file is larger than ${Math.round(MAX_APK_BYTES / 1024 / 1024)}MB, which no build of this app should be.`);
  }

  const objectKey = `${R2_PREFIXES.app}/${Date.now()}-${sanitizeFilenameStem(params.filename)}.apk`;
  return {
    // Thirty minutes: a 100MB upload on a slow connection takes a while.
    uploadUrl: await getPresignedUploadUrl({ objectKey, contentType: APK_CONTENT_TYPE, expiresInSeconds: 30 * 60 }),
    apkUrl: buildPublicUrl(objectKey),
    contentType: APK_CONTENT_TYPE,
  };
}

/**
 * For a build in the association's own storage, that the stored file is
 * really there and really the size being recorded.
 *
 * An upload that stopped half way leaves a short file behind. Recorded as
 * if it were whole, every phone would download it, find its hash wrong, and
 * refuse it — safely, but the release would be dead on arrival. An address
 * somewhere else is left to the administrator; there is nothing here to
 * check it against.
 */
export async function checkStoredApk(apkUrl: string, sizeBytes: number): Promise<void> {
  const objectKey = extractObjectKeyFromPublicUrl(apkUrl);
  if (!objectKey) return;

  const stored = await getObjectMetadata(objectKey);
  if (!stored) {
    throw new ReleaseError("There's no file at that address in the association's storage. Upload the APK again.");
  }
  if (stored.size !== sizeBytes) {
    throw new ReleaseError(
      `The stored file is ${stored.size.toLocaleString("en-GB")} bytes, not ${sizeBytes.toLocaleString("en-GB")}. The upload may not have finished — upload the APK again.`,
    );
  }
}

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
  await checkStoredApk(input.apkUrl, input.sizeBytes);

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
