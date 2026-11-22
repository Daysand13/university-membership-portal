import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import { buildPublicUrl, deleteObject, isR2Configured, R2_PREFIXES, uploadBuffer } from "@/lib/storage/r2";
import {
  APK_CONTENT_TYPE,
  MAX_APK_BYTES,
  ReleaseError,
  createRelease,
  setReleasePublished,
} from "@/lib/services/app-release-service";
import { ApkSignatureError, isSignedByAssociation } from "@/lib/apk-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publishing a build of the Android app without the admin page.
 *
 * The storage keys live only in Vercel and can't be read back out, so a
 * build is published from here, where they are. The caller gives an EAS
 * download link and the SHA-256 it got from its own verified copy; this
 * fetches the file itself and refuses it unless:
 *
 *  - the request carries APP_RELEASE_TOKEN (compared in constant time);
 *  - the link is an Expo build artifact, nothing else;
 *  - the file is the size an APK should be, and its SHA-256 is the one given;
 *  - every signature on it is the association's own signing certificate.
 *
 * The last is what makes a leaked token nearly harmless: only a build
 * signed with the association's key gets through, and that key isn't in
 * the token's reach. After that it is createRelease and
 * setReleasePublished, with every rule the admin page has, recorded in the
 * name of the administrator who published the previous release, and the
 * audit log says it came through here.
 */

const ARTIFACT = /^https:\/\/expo\.dev\/artifacts\/eas\/[A-Za-z0-9_-]+\.apk$/;

const schema = z.object({
  artifactUrl: z.string().regex(ARTIFACT, "Give the .apk link EAS shows for the build (https://expo.dev/artifacts/eas/…)."),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "SHA-256 of the build: 64 lower-case hex characters."),
  version: z.string(),
  buildNumber: z.number().int().positive(),
  changelog: z.string().trim().min(1, "Say what changed."),
  minimumBuild: z.number().int().min(0).optional(),
  minAndroidSdk: z.number().int().min(21).max(40).optional(),
  publish: z.boolean().default(true),
});

function tokenMatches(given: string | null): boolean {
  // Trimmed: a value piped into Vercel from Windows can keep a stray carriage return.
  const expected = process.env.APP_RELEASE_TOKEN?.trim();
  const sent = given?.trim();
  if (!expected || expected.length < 32 || !sent) return false;
  // Hashed first, so the comparison is the same length whatever was sent.
  const a = createHash("sha256").update(sent).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const refuse = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new ReleaseError(`Expo answered ${response.status} for that link.`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_APK_BYTES) throw new ReleaseError("That file is far larger than any build of this app.");

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_APK_BYTES) {
      await reader.cancel();
      throw new ReleaseError("That file is far larger than any build of this app.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(`app-release-publish:${clientIpFrom(request.headers)}`, { max: 10, windowSeconds: 3600 });
  if (!limit.allowed) return refuse("Too many attempts. Try again later.", 429);

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenMatches(bearer)) return refuse("Not allowed.", 401);
  if (!isR2Configured()) return refuse("File storage isn't set up on this site.", 503);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return refuse(parsed.error.issues[0]?.message ?? "That request wasn't readable.", 400);
  const input = parsed.data;

  try {
    const apk = await download(input.artifactUrl);
    const sha256 = createHash("sha256").update(apk).digest("hex");
    if (sha256 !== input.sha256) {
      return refuse(`The file at that link has SHA-256 ${sha256}, not the ${input.sha256} given. Nothing was published.`, 422);
    }
    if (!isSignedByAssociation(apk)) {
      return refuse("That build isn't signed with the association's key. Nothing was published.", 422);
    }

    const previous = await db.appRelease.findFirst({ orderBy: { buildNumber: "desc" } });
    const admin = previous?.publishedById
      ? await db.adminUser.findFirst({ where: { id: previous.publishedById, isActive: true }, select: { id: true } })
      : null;
    if (!admin) return refuse("There's no earlier release whose administrator this could be recorded under. Publish it once from the admin page.", 409);

    const objectKey = `${R2_PREFIXES.app}/${Date.now()}-assn-${input.version.replace(/[^0-9.]/g, "")}.apk`;
    await uploadBuffer({ objectKey, contentType: APK_CONTENT_TYPE, body: apk });

    // A release the rules refuse (an old build number, a version that
    // exists) leaves no file behind in storage.
    const release = await createRelease(
      {
        version: input.version,
        buildNumber: input.buildNumber,
        apkUrl: buildPublicUrl(objectKey),
        sha256,
        sizeBytes: apk.length,
        changelog: input.changelog,
        minimumBuild: input.minimumBuild ?? previous?.minimumBuild ?? 0,
        minAndroidSdk: input.minAndroidSdk ?? previous?.minAndroidSdk ?? 26,
      },
      admin,
    ).catch(async (err) => {
      await Promise.resolve()
        .then(() => deleteObject(objectKey))
        .catch(() => undefined);
      throw err;
    });
    if (input.publish) await setReleasePublished({ id: release.id, published: true, admin });

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "APP_RELEASE_VIA_TOKEN",
        entityType: "AppRelease",
        entityId: release.id,
        newValue: { version: release.version, buildNumber: release.buildNumber, source: input.artifactUrl, published: input.publish },
      },
    });

    return NextResponse.json({
      ok: true,
      id: release.id,
      version: release.version,
      buildNumber: release.buildNumber,
      sizeBytes: apk.length,
      sha256,
      published: input.publish,
    });
  } catch (err) {
    if (err instanceof ReleaseError || err instanceof ApkSignatureError) return refuse(`${err.message} Nothing was published.`, 422);
    console.error("[app-release-publish]", err);
    return refuse("Publishing failed. Nothing was published.", 500);
  }
}
