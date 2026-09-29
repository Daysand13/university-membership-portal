/**
 * Refuses to build an app pointed at an address that redirects.
 *
 * The address is baked into the APK, and one that redirects to another
 * host is not merely slow: the redirect drops the Authorization header, so
 * signing in works and every call after it arrives with no token. The app
 * shipped like that once — it signed people out a moment after they signed
 * in, and no phone ever registered for notifications. Nothing in the build
 * noticed, because nothing asked.
 *
 * Checks every profile in eas.json that points at the internet. A local
 * development address is skipped; it is not reachable from here and not
 * what anybody hands to a member.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const eas = JSON.parse(readFileSync(join(here, "..", "eas.json"), "utf8"));

const only = process.argv[2]; // e.g. "production"
const profiles = Object.entries(eas.build ?? {}).filter(([name]) => !only || name === only);

let failed = false;

for (const [name, profile] of profiles) {
  const base = profile.env?.EXPO_PUBLIC_API_URL;
  if (!base || /^http:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1)/.test(base)) continue;

  const url = `${base.replace(/\/+$/, "")}/api/v1/app/version?build=1&sdk=26`;
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });

    if (response.status >= 300 && response.status < 400) {
      failed = true;
      console.error(
        `\n  ✖ ${name}: ${base} redirects to ${response.headers.get("location")}\n` +
          `    The redirect would strip the sign-in token from every request.\n` +
          `    Set EXPO_PUBLIC_API_URL in eas.json to the address it redirects to.\n`,
      );
      continue;
    }

    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) {
      failed = true;
      console.error(`\n  ✖ ${name}: ${url} answered ${response.status}, not the app API.\n`);
      continue;
    }

    console.log(`  ✔ ${name}: ${base} answers directly`);
  } catch (err) {
    // A profile pointing at a host that does not exist is worth saying,
    // but only fatal for the profile actually being built.
    const message = err instanceof Error ? err.message : String(err);
    if (only === name) {
      failed = true;
      console.error(`\n  ✖ ${name}: ${base} could not be reached (${message}).\n`);
    } else {
      console.warn(`  ! ${name}: ${base} could not be reached (${message}) — only matters if you build it.`);
    }
  }
}

process.exit(failed ? 1 : 0);
