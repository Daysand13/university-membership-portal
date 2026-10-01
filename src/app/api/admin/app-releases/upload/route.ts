import { NextRequest, NextResponse } from "next/server";
import { adminCan, getCurrentAdmin } from "@/lib/auth/admin";
import { NO_PERMISSION_MESSAGE } from "@/lib/auth/capabilities";
import { ReleaseError, requestApkUpload } from "@/lib/services/app-release-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A signed address to upload a build of the Android app to.
 *
 * A route handler rather than a Server Action: an action's address changes
 * with every deployment, and an administrator who opened the page before a
 * deploy would otherwise be refused with no explanation. Only somebody who
 * may manage releases (the same capability the App Releases page needs) is
 * given one.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Your admin session has expired. Sign in again in a new tab, then choose the file again." },
      { status: 401 },
    );
  }
  if (!adminCan(admin, "site.settings")) {
    return NextResponse.json({ ok: false, error: NO_PERMISSION_MESSAGE }, { status: 403 });
  }

  const limit = await checkRateLimit(`app-release-upload:${admin.id}`, { max: 20, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many uploads in a short time. Please wait a while." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { filename?: unknown; fileSize?: unknown } | null;
  if (!body || typeof body.filename !== "string" || typeof body.fileSize !== "number") {
    return NextResponse.json({ ok: false, error: "That upload request was incomplete. Choose the file again." }, { status: 400 });
  }

  try {
    const ticket = await requestApkUpload({ filename: body.filename, fileSize: body.fileSize });
    return NextResponse.json({ ok: true, ...ticket }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof ReleaseError) return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    console.error("[app-release-upload]", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
