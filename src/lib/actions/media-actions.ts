"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  requestImageUpload as requestImageUploadService,
  confirmImageUpload as confirmImageUploadService,
  requestDocumentUpload as requestDocumentUploadService,
  deleteMedia as deleteMediaService,
} from "@/lib/services/media-service";
import type { MediaCategory } from "@/generated/prisma/client";

export interface UploadTicket {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

/**
 * Returns a short-lived signed URL the browser uploads directly to R2 with.
 * Used by every admin-facing image field (news cover, event banner, hero
 * slide, about/donate imagery, logo, etc.) so file bytes never transit the
 * Next.js server for authenticated uploads.
 */
export async function requestAdminImageUpload(input: {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: MediaCategory;
}): Promise<UploadTicket> {
  await requireAdminUser();
  return requestImageUploadService(input);
}

export async function requestAdminDocumentUpload(input: {
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<UploadTicket> {
  await requireAdminUser();
  return requestDocumentUploadService(input);
}

/** Records an upload in the shared Media Library (Admin > Media). Inline
 * entity image fields (news cover, etc.) don't need this — they just store
 * the resulting public URL directly on the owning record. */
export async function confirmMediaLibraryUpload(input: {
  objectKey: string;
  mimeType: string;
  fileSize: number;
  filename: string;
  altText?: string;
  category: MediaCategory;
}) {
  const admin = await requireAdminUser();
  const media = await confirmImageUploadService({ ...input, uploadedById: admin.id });
  revalidatePath("/admin/media");
  return media;
}

export async function deleteAdminMedia(id: string) {
  await requireAdminUser();
  await deleteMediaService(id);
  revalidatePath("/admin/media");
}
