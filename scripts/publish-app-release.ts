/**
 * Publishes a build of the Android app to Admin -> App Releases.
 *
 *   npx dotenv -e .env -- npx tsx scripts/publish-app-release.ts \
 *     --artifact https://expo.dev/artifacts/eas/<id>.apk \
 *     --apk C:/Users/<you>/Downloads/builds/assn-1.2.0.apk \
 *     --version 1.2.0 --build 4 --notes notes.txt [--draft] [--site https://www.assnuew.com]
 *
 * --apk is the copy already downloaded and checked (size, ZIP, signing
 * key); its SHA-256 is sent along, and the website fetches the artifact
 * itself and refuses it unless the two match and the build is signed with
 * the association's key. The storage keys never leave Vercel: the website
 * does the upload, through POST /api/admin/app-releases/publish.
 *
 * Needs APP_RELEASE_TOKEN, the same value as in the Vercel project.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const artifactUrl = flag("artifact");
  const apk = flag("apk");
  const version = flag("version");
  const buildNumber = Number(flag("build"));
  const notes = flag("notes");
  const site = (flag("site") ?? "https://www.assnuew.com").replace(/\/+$/, "");
  const token = process.env.APP_RELEASE_TOKEN;
  if (!artifactUrl || !apk || !version || !buildNumber || !notes) {
    throw new Error("Usage: --artifact <expo .apk link> --apk <verified copy> --version <x.y.z> --build <n> --notes <file> [--draft]");
  }
  if (!token) throw new Error("APP_RELEASE_TOKEN isn't set (it lives in .env and in Vercel).");

  const sha256 = createHash("sha256").update(readFileSync(apk)).digest("hex");
  console.log(`Publishing ${version} (build ${buildNumber}), sha256 ${sha256}`);

  const response = await fetch(`${site}/api/admin/app-releases/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      artifactUrl,
      sha256,
      version,
      buildNumber,
      changelog: readFileSync(notes, "utf8").trim(),
      publish: !process.argv.includes("--draft"),
    }),
  });
  const reply = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !reply.ok) throw new Error(`${response.status}: ${String(reply.error ?? "no answer")}`);
  console.log(
    `${reply.published ? "Published" : "Recorded as a draft"}: ${String(reply.version)} (build ${String(reply.buildNumber)}), ` +
      `${Number(reply.sizeBytes).toLocaleString("en-GB")} bytes, release ${String(reply.id)}`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
