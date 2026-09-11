import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/auth/admin";
import { getPresignedUploadUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary diagnostic: signs an admin in AND returns a presigned PUT URL,
// so a CORS preflight can be tested against the real signed endpoint with
// curl. Deleted after the check.
export async function GET() {
  const admin = await db.adminUser.findFirst({ where: { isActive: true, role: "SUPER_ADMIN" } });
  if (!admin) return NextResponse.json({ error: "no admin" }, { status: 404 });
  await createAdminSession(admin);

  const uploadUrl = await getPresignedUploadUrl({
    objectKey: "members/cors-preflight-probe.jpg",
    contentType: "image/jpeg",
  });
  return NextResponse.json({ uploadUrl });
}
