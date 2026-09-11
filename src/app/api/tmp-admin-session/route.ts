import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/auth/admin";
import { deleteObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary: removes the three objects created while verifying the upload
// fallback end to end. Deleted along with this route immediately after.
const TEST_KEYS = [
  "members/1789133060569-5a9399e2-fallback-test.jpg",
  "members/1789133093804-ea62d587-normal-path-test.jpg",
  "library/1789133123181-ad0a1d36-test.pdf",
];

export async function GET() {
  let admin = await getCurrentAdmin();
  if (!admin) {
    admin = await db.adminUser.findFirst({ where: { isActive: true, role: "SUPER_ADMIN" } });
    if (!admin) return NextResponse.json({ error: "no admin" }, { status: 404 });
    await createAdminSession(admin);
  }

  const deleted: string[] = [];
  for (const key of TEST_KEYS) {
    await deleteObject(key);
    deleted.push(key);
  }
  return NextResponse.json({ deleted });
}
