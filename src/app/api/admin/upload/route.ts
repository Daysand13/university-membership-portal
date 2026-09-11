import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { uploadAdminBytes } from "@/lib/services/media-service";
import type { MediaCategory } from "@/generated/prisma/client";

// Needs the full Node runtime for the R2 client.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "HERO",
  "LOGO",
  "NEWS",
  "EVENT",
  "ELECTION",
  "PROFILE",
  "LIBRARY_THUMBNAIL",
  "DONATION",
  "OTHER",
] as const satisfies readonly MediaCategory[];

/**
 * Same-origin upload fallback for the admin file fields.
 *
 * Admin uploads normally go browser → R2 directly with a presigned PUT,
 * which keeps big files away from Vercel's 4.5MB request body cap. That
 * PUT is cross-origin though, and some Android in-app browsers (a link
 * opened inside WhatsApp or Facebook) send `Origin: null`, which R2
 * refuses — the browser then blocks the upload before it is even sent.
 * This route takes the same bytes over a same-origin request, where no
 * CORS check applies at all, and puts them in R2 from the server.
 *
 * It is deliberately NOT the default path: everything sent here counts
 * against that 4.5MB cap, so the client only reaches for it after the
 * direct upload has actually failed, and only for files small enough to
 * fit (see FALLBACK_MAX_BYTES in lib/client/admin-upload.ts).
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    // Vercel rejects an oversized body before the handler runs, but a
    // truncated or malformed one can still land here.
    console.error("[admin-upload-fallback] could not read the request body", err);
    return NextResponse.json({ ok: false, error: "That upload didn't arrive in one piece. Please try again." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file was included." }, { status: 400 });
  }

  const kind = formData.get("kind") === "document" ? "document" : "image";
  // Checked against the real enum rather than cast: an unrecognised value
  // would otherwise reach the prefix lookup as a miss and put the object
  // under a folder literally named "undefined".
  const rawCategory = String(formData.get("category") ?? "");
  const category: MediaCategory = (VALID_CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as MediaCategory)
    : "OTHER";
  // The browser resolved this already (some Android file providers hand
  // back a File with an empty type), so prefer what it sent and fall back
  // to the File's own type.
  const mimeType = String(formData.get("mimeType") || file.type || "");

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadAdminBytes({
      bytes,
      filename: file.name,
      mimeType,
      kind,
      category,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      publicUrl: result.publicUrl,
      objectKey: result.objectKey,
      mimeType,
      fileSize: bytes.byteLength,
      filename: file.name,
    });
  } catch (err) {
    console.error("[admin-upload-fallback] storing the file failed", err);
    return NextResponse.json({ ok: false, error: "We couldn't save that file. Please try again." }, { status: 500 });
  }
}
