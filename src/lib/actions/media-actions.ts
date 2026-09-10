"use server";

import { withTypedActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  requestImageUpload as requestImageUploadService,
  confirmImageUpload as confirmImageUploadService,
  requestDocumentUpload as requestDocumentUploadService,
  deleteMedia as deleteMediaService,
} from "@/lib/services/media-service";
import type { MediaCategory } from "@/generated/prisma/client";

import type { UploadTicketResult } from "@/lib/services/media-service";

export type { UploadTicketResult };

/**
 * Returns a short-lived signed URL the browser uploads directly to R2 with.
 * Used by every admin-facing image field (news cover, event banner, hero
 * slide, about/donate imagery, logo, etc.) so file bytes never transit the
 * Next.js server for authenticated uploads.
 */
async function requestAdminImageUploadImpl(input: {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: MediaCategory;
}): Promise<UploadTicketResult> {
  await requireAdminUser();
  return requestImageUploadService(input);
}

async function requestAdminDocumentUploadImpl(input: {
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<UploadTicketResult> {
  await requireAdminUser();
  return requestDocumentUploadService(input);
}

/** Records an upload in the shared Media Library (Admin > Media). Inline
 * entity image fields (news cover, etc.) don't need this — they just store
 * the resulting public URL directly on the owning record. */
async function confirmMediaLibraryUploadImpl(input: {
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

async function deleteAdminMediaImpl(id: string) {
  await requireAdminUser();
  await deleteMediaService(id);
  revalidatePath("/admin/media");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const requestAdminImageUpload = withTypedActionErrorHandling("requestAdminImageUpload", requestAdminImageUploadImpl);
export const requestAdminDocumentUpload = withTypedActionErrorHandling("requestAdminDocumentUpload", requestAdminDocumentUploadImpl);
export const confirmMediaLibraryUpload = withTypedActionErrorHandling("confirmMediaLibraryUpload", confirmMediaLibraryUploadImpl);
export const deleteAdminMedia = withVoidActionErrorHandling("deleteAdminMedia", deleteAdminMediaImpl);
