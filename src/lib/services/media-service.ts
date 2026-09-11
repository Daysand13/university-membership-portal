import "server-only";
import { db } from "@/lib/db";
import {
  generateObjectKey,
  getPresignedUploadUrl,
  buildPublicUrl,
  deleteObject,
  isR2Configured,
  uploadBuffer,
  type R2Prefix,
} from "@/lib/storage/r2";
import { validateUploadRequest } from "@/lib/storage/validation";
import type { MediaCategory } from "@/generated/prisma/client";

const CATEGORY_TO_PREFIX: Record<MediaCategory, R2Prefix> = {
  HERO: "site",
  LOGO: "site",
  NEWS: "news",
  EVENT: "events",
  ELECTION: "elections",
  PROFILE: "members",
  LIBRARY_THUMBNAIL: "library",
  DONATION: "donations",
  OTHER: "media",
};

/**
 * The outcome of asking for an upload ticket.
 *
 * A rejected file is a normal answer, not an exception. It used to throw,
 * and that quietly broke the admin: Next.js replaces Server Action error
 * messages with an opaque digest in production, so "Images must be 5 MB or
 * smaller" never reached the browser and every upload field fell back to
 * blaming R2 configuration — which sent people looking at Cloudflare for
 * what was usually just an oversized photo. Returning the reason keeps it
 * intact all the way to the person who needs to read it. Genuine
 * infrastructure faults still throw.
 */
export type UploadTicketResult =
  | { ok: true; uploadUrl: string; objectKey: string; publicUrl: string }
  | { ok: false; error: string };

/** Said plainly, because this one isn't the admin's to fix — it needs a
 *  deployment credential, not a different file. */
const STORAGE_UNCONFIGURED =
  "Image storage isn't set up for this environment, so uploads can't be saved. This needs a site administrator to configure Cloudflare R2.";

/**
 * Step 1 of an authenticated admin image upload: validate the declared
 * file, then hand back a short-lived signed PUT URL the browser can upload
 * directly to R2 with (see lib/storage/r2.ts for the full flow).
 */
export async function requestImageUpload(params: {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: MediaCategory;
}): Promise<UploadTicketResult> {
  const { filename, mimeType, fileSize, category } = params;
  const check = validateUploadRequest({ filename, mimeType, fileSize, category: "image" });
  if (!check.ok) return { ok: false, error: check.error };
  if (!isR2Configured()) return { ok: false, error: STORAGE_UNCONFIGURED };

  const objectKey = generateObjectKey(CATEGORY_TO_PREFIX[category], filename, mimeType);
  const uploadUrl = await getPresignedUploadUrl({ objectKey, contentType: mimeType });
  return { ok: true, uploadUrl, objectKey, publicUrl: buildPublicUrl(objectKey) };
}

/**
 * Step 2: once the browser confirms the direct-to-R2 upload succeeded, the
 * backend records the metadata (never the bytes) in Postgres.
 */
export async function confirmImageUpload(params: {
  objectKey: string;
  mimeType: string;
  fileSize: number;
  filename: string;
  altText?: string;
  category: MediaCategory;
  uploadedById: string;
}) {
  const { objectKey, mimeType, fileSize, filename, altText, category, uploadedById } = params;
  return db.media.create({
    data: {
      filename,
      category,
      r2ObjectKey: objectKey,
      publicUrl: buildPublicUrl(objectKey),
      mimeType,
      fileSize,
      altText: altText || null,
      uploadedById,
    },
  });
}

export async function deleteMedia(id: string) {
  const media = await db.media.findUniqueOrThrow({ where: { id } });
  await db.media.delete({ where: { id } });
  try {
    await deleteObject(media.r2ObjectKey);
  } catch (err) {
    console.error("[media] failed to delete R2 object for", id, err);
  }
}

export async function listMedia(category?: MediaCategory) {
  return db.media.findMany({
    where: category ? { category } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/**
 * Step 1 for library documents specifically (separate from generic Media —
 * documents live in their own table with download counts, categories, and
 * public/private visibility).
 */
export async function requestDocumentUpload(params: {
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<UploadTicketResult> {
  const { filename, mimeType, fileSize } = params;
  const check = validateUploadRequest({ filename, mimeType, fileSize, category: "document" });
  if (!check.ok) return { ok: false, error: check.error };
  if (!isR2Configured()) return { ok: false, error: STORAGE_UNCONFIGURED };

  const objectKey = generateObjectKey("library", filename, mimeType);
  const uploadUrl = await getPresignedUploadUrl({ objectKey, contentType: mimeType, expiresInSeconds: 600 });
  return { ok: true, uploadUrl, objectKey, publicUrl: buildPublicUrl(objectKey) };
}

/**
 * Uploads bytes to R2 from the server, as a fallback for when the browser
 * can't reach R2 directly.
 *
 * The normal path is a presigned PUT straight from the browser, which
 * exists to keep large files away from Vercel's 4.5MB request body cap.
 * But that PUT is cross-origin, so it depends on R2's CORS policy naming
 * the exact origin the page is served from — and some Android in-app
 * browsers (a link opened inside WhatsApp or Facebook, which is how most
 * people on Android open links) send `Origin: null` on cross-origin
 * requests. R2 answers a null origin with 403, the browser blocks the PUT
 * before it leaves the device, and the upload fails with what looks like a
 * dropped connection. Verified directly against the live bucket: the
 * canonical origins preflight fine, `null` gets 403.
 *
 * Routing those bytes through our own server instead makes the request
 * same-origin, so no CORS check applies at all and it works in any
 * browser, WebView, or restrictive proxy. The trade-off is that body cap,
 * which is why this is a fallback rather than the default — see
 * FALLBACK_MAX_BYTES in lib/client/admin-upload.ts for the ceiling the
 * client keeps it under.
 */
export async function uploadAdminBytes(params: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  kind: "image" | "document";
  category: MediaCategory;
}): Promise<UploadTicketResult> {
  const { bytes, filename, mimeType, kind, category } = params;

  const check = validateUploadRequest({ filename, mimeType, fileSize: bytes.byteLength, category: kind });
  if (!check.ok) return { ok: false, error: check.error };
  if (!isR2Configured()) return { ok: false, error: STORAGE_UNCONFIGURED };

  const prefix = kind === "document" ? "library" : CATEGORY_TO_PREFIX[category];
  const objectKey = generateObjectKey(prefix, filename, mimeType);
  await uploadBuffer({ objectKey, contentType: mimeType, body: bytes });

  // Shaped like the presigned result so callers can treat both paths
  // identically; uploadUrl is empty because the upload already happened.
  return { ok: true, uploadUrl: "", objectKey, publicUrl: buildPublicUrl(objectKey) };
}
