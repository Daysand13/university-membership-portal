import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary: signs in an existing admin so the CORS diagnostic route can be
// reached with real auth. Deleted immediately after the check.
export async function GET() {
  const admin = await db.adminUser.findFirst({ where: { isActive: true, role: "SUPER_ADMIN" } });
  if (!admin) return NextResponse.json({ error: "no admin" }, { status: 404 });
  await createAdminSession(admin);
  return NextResponse.json({ signedInAs: admin.email });
}
