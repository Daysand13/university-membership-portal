import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin";
import { deleteObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary: deletes the one orphaned test object this diagnostic session
// created directly in R2 while confirming uploads work end to end. Deleted
// after use, along with this whole route.
export async function GET() {
  await requireAdminUser();
  await deleteObject("members/1789119548012-4ecbfb3c-test-photo.jpg");
  return NextResponse.json({ deleted: true });
}
