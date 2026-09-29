import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";

/**
 * Pulls the association's own logo out of Site Settings.
 *
 * The app's launcher icon has to be the association's mark, and the mark
 * does not live in this repository — an administrator uploads it, and it
 * sits in R2 with its address in the settings row. Rather than invent
 * something, this fetches whatever they actually set.
 *
 *   npx dotenv -e .env.staging.local -- npx tsx prisma/fetch-logo.ts
 */
async function main() {
  const record = await db.siteSetting.findUnique({ where: { key: "site-settings" } });
  const value = (record?.value ?? {}) as Record<string, unknown>;

  for (const field of ["logoUrl", "universityLogoUrl", "faviconUrl"]) {
    const url = value[field];
    console.log(`${field}: ${typeof url === "string" && url ? url : "(not set)"}`);
  }

  const logoUrl = typeof value.logoUrl === "string" ? value.logoUrl : null;
  if (!logoUrl) {
    console.log("\nNo association logo is set in Site Settings, so there is nothing to use.");
    await db.$disconnect();
    return;
  }

  const response = await fetch(logoUrl);
  if (!response.ok) {
    console.log(`\nCouldn't download it (${response.status}).`);
    await db.$disconnect();
    return;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = logoUrl.split(".").pop()?.split("?")[0] ?? "png";
  const out = `mobile/assets/association-logo.${ext}`;
  writeFileSync(out, bytes);
  console.log(`\nSaved ${bytes.length} bytes to ${out}`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
