import { NextRequest, NextResponse } from "next/server";
import { storeEnrollmentUpload, type EnrollmentUploadKind } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Needs the full Node runtime for the R2 client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin upload fallback for the PUBLIC enrollment and further-studies
 * forms, used only when the browser can't reach R2 directly.
 *
 * Attachments normally go browser → R2 with a presigned PUT, which is
 * cross-origin and therefore subject to R2's CORS policy. Android in-app
 * browsers (a link opened inside WhatsApp or Facebook) report
 * `Origin: null`, R2 refuses that, and the browser blocks the upload before
 * it is sent — leaving the applicant unable to attach their passport photo
 * at all. A same-origin request has no CORS check, so it works everywhere.
 *
 * This is unauthenticated by necessity — applicants have no account yet —
 * so it is rate limited per IP, and every constraint the presigned path
 * relies on still applies inside storeEnrollmentUpload: the object key is
 * generated server-side, the returned ticket is HMAC-signed, and the bytes
 * are sniffed before anything is written. Submission re-verifies the stored
 * object independently regardless of which path uploaded it.
 */

/** Generous because a whole campus can share one address, and each
 *  applicant legitimately uploads two files (passport + medical). */
const RATE_LIMIT = { max: 30, windowSeconds: 600 };

export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`enroll-upload:ip:${ip}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many uploads from this connection. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("[enroll-upload-fallback] could not read the request body", err);
    return NextResponse.json(
      { ok: false, error: "That file didn't arrive in one piece. Please try attaching it again." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file was included." }, { status: 400 });
  }

  const rawKind = String(formData.get("kind") ?? "");
  if (rawKind !== "passport" && rawKind !== "medical") {
    return NextResponse.json({ ok: false, error: "Unknown upload type." }, { status: 400 });
  }
  const kind: EnrollmentUploadKind = rawKind;

  // The browser resolved this already (some Android file providers hand back
  // a File with an empty type), so prefer what it sent.
  const mimeType = String(formData.get("mimeType") || file.type || "");
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await storeEnrollmentUpload({ kind, filename: file.name, mimeType, bytes });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, token: result.token, bytes: bytes.byteLength, filename: file.name });
  } catch (err) {
    console.error("[enroll-upload-fallback] storing the file failed", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't save that file. Please try attaching it again." },
      { status: 500 },
    );
  }
}
