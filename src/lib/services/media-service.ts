import "server-only";
import { db } from "@/lib/db";
import {
  generateObjectKey,
  getPresignedUploadUrl,
  buildPublicUrl,
  deleteObject,
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
 * Step 1 of an authenticated admin image upload: validate the declared
 * file, then hand back a short-lived signed PUT URL the browser can upload
 * directly to R2 with (see lib/storage/r2.ts for the full flow).
 */
export async function requestImageUpload(params: {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: MediaCategory;
}): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string }> {
  const { filename, mimeType, fileSize, category } = params;
  const check = validateUploadRequest({ filename, mimeType, fileSize, category: "image" });
  if (!check.ok) throw new Error(check.error);

  const objectKey = generateObjectKey(CATEGORY_TO_PREFIX[category], filename, mimeType);
  const uploadUrl = await getPresignedUploadUrl({ objectKey, contentType: mimeType });
  return { uploadUrl, objectKey, publicUrl: buildPublicUrl(objectKey) };
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
}): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string }> {
  const { filename, mimeType, fileSize } = params;
  const check = validateUploadRequest({ filename, mimeType, fileSize, category: "document" });
  if (!check.ok) throw new Error(check.error);

  const objectKey = generateObjectKey("library", filename, mimeType);
  const uploadUrl = await getPresignedUploadUrl({ objectKey, contentType: mimeType, expiresInSeconds: 600 });
  return { uploadUrl, objectKey, publicUrl: buildPublicUrl(objectKey) };
}
