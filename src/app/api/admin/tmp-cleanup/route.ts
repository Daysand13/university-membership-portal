import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { deleteObject, getObjectMetadata } from "@/lib/storage/r2";

// TEMPORARY — removes the two objects left behind by verifying the enrollment
// upload fallback on production. Delete this route once it has run.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = [
  "members/1789134887917-8c4e379a-fallback-test.jpg",
  "members/1789134926246-72fc3cb0-normal-path-test.jpg",
];

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const results: Record<string, string> = {};
  for (const key of KEYS) {
    const before = await getObjectMetadata(key);
    if (!before) {
      results[key] = "not found";
      continue;
    }
    await deleteObject(key);
    const after = await getObjectMetadata(key);
    results[key] = after ? "STILL PRESENT" : "deleted";
  }
  return NextResponse.json({ ok: true, results });
}
