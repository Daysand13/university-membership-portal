/**
 * Publishes a build of the Android app, exactly as Admin -> App Releases
 * does: the APK goes to the association's storage through a short-lived
 * signed address, the release is recorded through createRelease (build
 * numbers only go up, the stored file must be whole), and only then is it
 * offered to phones. Every check is the website's own; this only saves
 * somebody uploading 100MB through a browser.
 *
 *   npx dotenv -e .env -- npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/publish-app-release.ts \
 *     --apk C:/Users/.../builds/assn-1.2.0.apk --version 1.2.0 --build 4 --notes notes.txt
 *
 * It needs the storage keys (R2_*) in the environment. They live in Vercel;
 * `vercel env pull .env.vercel.local --environment=production` fetches them,
 * then add `-e .env.vercel.local` to the dotenv call.
 *
 * Optional: --minimum-build N (default: the previous release's), --min-sdk N
 * (default: the previous release's, else 26), --draft (record, don't offer).
 *
 * The release is recorded in the name of whoever published the previous
 * one - the association's own administrator - and the audit log says so.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { db } from "../src/lib/db";
import { createRelease, requestApkUpload, setReleasePublished } from "../src/lib/services/app-release-service";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apk = flag("apk");
  const version = flag("version");
  const build = Number(flag("build"));
  const notesFile = flag("notes");
  if (!apk || !version || !build || !notesFile) {
    throw new Error("Usage: --apk <file.apk> --version <x.y.z> --build <n> --notes <changelog.txt> [--minimum-build n] [--min-sdk n] [--draft]");
  }
  const changelog = readFileSync(notesFile, "utf8").trim();
  const bytes = readFileSync(apk);
  const sizeBytes = statSync(apk).size;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const previous = await db.appRelease.findFirst({ orderBy: { buildNumber: "desc" } });
  if (!previous?.publishedById) throw new Error("No earlier release to take the publishing administrator from.");
  const admin = await db.adminUser.findUnique({ where: { id: previous.publishedById }, select: { id: true, isActive: true } });
  if (!admin?.isActive) throw new Error("The administrator who published the last release is no longer active.");

  console.log(`Uploading ${basename(apk)} (${sizeBytes.toLocaleString("en-GB")} bytes, sha256 ${sha256})`);
  const upload = await requestApkUpload({ filename: basename(apk), fileSize: sizeBytes });
  const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": upload.contentType }, body: bytes });
  if (!put.ok) throw new Error(`Storage refused the upload: ${put.status} ${await put.text()}`);

  const release = await createRelease(
    {
      version,
      buildNumber: build,
      apkUrl: upload.apkUrl,
      sha256,
      sizeBytes,
      changelog,
      minimumBuild: flag("minimum-build") ? Number(flag("minimum-build")) : previous.minimumBuild,
      minAndroidSdk: flag("min-sdk") ? Number(flag("min-sdk")) : previous.minAndroidSdk || 26,
    },
    admin,
  );
  console.log(`Recorded ${release.version} (build ${release.buildNumber}) as ${release.id}`);

  if (process.argv.includes("--draft")) {
    console.log("Left as a draft: publish it from Admin -> App Releases.");
    return;
  }
  await setReleasePublished({ id: release.id, published: true, admin });
  console.log(`Published. Phones on older builds will be offered ${release.version}.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
