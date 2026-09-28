import { type NextRequest } from "next/server";
import { appJson } from "@/lib/api/app-request";
import { db } from "@/lib/db";
import { buildFrom, decideUpdate, type ReleaseManifest } from "@/lib/app-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Is there a newer ASSN?"
 *
 * Open without signing in, because an app too old to sign in must still be
 * able to update itself.
 *
 * What comes back is metadata only: a version, a size, a changelog, an
 * address and a SHA-256. The phone checks the hash of what it downloads
 * against that, and Android then checks the signing certificate before it
 * will replace the installed app — which is the check that actually stops
 * somebody else's APK taking its place.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const currentBuild = buildFrom(params.get("build"));
  const androidSdk = buildFrom(params.get("sdk")) || null;

  const newest = await db.appRelease.findFirst({
    where: { published: true },
    orderBy: { buildNumber: "desc" },
  });

  const latest: ReleaseManifest | null = newest
    ? {
        version: newest.version,
        buildNumber: newest.buildNumber,
        apkUrl: newest.apkUrl,
        sha256: newest.sha256,
        sizeBytes: newest.sizeBytes,
        changelog: newest.changelog,
        minimumBuild: newest.minimumBuild,
        minAndroidSdk: newest.minAndroidSdk,
        releasedAt: newest.releasedAt.toISOString(),
      }
    : null;

  return appJson({ ...decideUpdate({ currentBuild, androidSdk, latest }) });
}
