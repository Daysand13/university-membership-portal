import { NextRequest, NextResponse } from "next/server";
import { getCurrentPatron } from "@/lib/auth/patron";
import { storeEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit } from "@/lib/rate-limit";

// Needs the full Node runtime for the R2 client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin fallback for a patron's document upload, used only when the
 * browser can't reach file storage directly (see api/enrollment/upload for
 * why that happens). The bytes are checked before anything is stored, and
 * the form submission verifies the stored file again.
 */
export async function POST(request: NextRequest) {
  const patron = await getCurrentPatron();
  if (!patron) {
    return NextResponse.json(
      { ok: false, error: "Your session has expired. Please sign in again, then attach the file again." },
      { status: 401 },
    );
  }

  const limit = await checkRateLimit(`patron-upload:${patron.id}`, { max: 40, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "You've uploaded a lot of files in a short time. Please wait a while and try again." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("[patron-upload-fallback] could not read the request body", err);
    return NextResponse.json({ ok: false, error: "That file didn't arrive in one piece. Please try attaching it again." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file was included." }, { status: 400 });
  }
  const mimeType = String(formData.get("mimeType") || file.type || "");
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await storeEnrollmentUpload({ kind: "patron-document", filename: file.name, mimeType, bytes });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, token: result.token, bytes: bytes.byteLength, filename: file.name });
  } catch (err) {
    console.error("[patron-upload-fallback] storing the file failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't save that file. Please try attaching it again." }, { status: 500 });
  }
}
