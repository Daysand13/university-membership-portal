"use server";

import { withTypedActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  confirmImageUpload as confirmImageUploadService,
  deleteMedia as deleteMediaService,
} from "@/lib/services/media-service";
import type { MediaCategory } from "@/generated/prisma/client";

import type { UploadTicketResult } from "@/lib/services/media-service";

export type { UploadTicketResult };

// Upload tickets are issued by the route handler at
// app/api/admin/upload/ticket rather than a Server Action here — see the
// comment there for why a long-open admin tab needs a URL that survives
// deployments.

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

export const confirmMediaLibraryUpload = withTypedActionErrorHandling("confirmMediaLibraryUpload", confirmMediaLibraryUploadImpl);
export const deleteAdminMedia = withVoidActionErrorHandling("deleteAdminMedia", deleteAdminMediaImpl);
