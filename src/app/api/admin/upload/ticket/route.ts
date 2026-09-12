import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { requestImageUpload, requestDocumentUpload, parseMediaCategory } from "@/lib/services/media-service";

// Needs the full Node runtime for the R2 client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRED = "Your admin session has expired. Sign in again in a new tab, then retry the upload.";
const MALFORMED = "The upload request was malformed. Please try again.";

/**
 * Issues the presigned URL an admin file field uploads to.
 *
 * This was a Server Action, and that was one real cause of uploads failing
 * "after a few tries". Next.js recalculates Server Action IDs on every
 * build, so a page opened before a deployment keeps calling an action ID
 * the new deployment no longer recognises: every call fails, every retry
 * fails identically, and only a full page reload fixes it. Phones make this
 * far more likely than desktops, because mobile browsers keep a tab alive
 * for days and restore it rather than reloading. A route handler's URL is
 * the same in every deployment, so an admin page left open keeps working.
 *
 * A rejected file (wrong type, too large) comes back as a normal 200 with
 * `ok: false` and the reason, exactly as the Server Action returned it.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: SESSION_EXPIRED }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("body is not an object");
    input = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: MALFORMED }, { status: 400 });
  }

  const filename = typeof input.filename === "string" ? input.filename.slice(0, 255) : "";
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.slice(0, 200) : "";
  const fileSize = typeof input.fileSize === "number" && Number.isFinite(input.fileSize) ? input.fileSize : -1;
  if (!filename || fileSize < 0) {
    return NextResponse.json({ ok: false, error: MALFORMED }, { status: 400 });
  }

  try {
    const result =
      input.kind === "document"
        ? await requestDocumentUpload({ filename, mimeType, fileSize })
        : await requestImageUpload({ filename, mimeType, fileSize, category: parseMediaCategory(input.category) });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin-upload-ticket] could not issue an upload URL", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
