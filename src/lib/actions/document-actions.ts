"use server";

import { withActionErrorHandling, withVoidActionErrorHandling, withTypedActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole, ContentStatus } from "@/generated/prisma/client";
import { documentSchema } from "@/lib/validations/content";
import {
  createDocument,
  updateDocumentMetadata,
  deleteDocument,
  incrementDownloadCount,
  getPublishedDocument,
} from "@/lib/services/document-service";
import { getPresignedDownloadUrl, buildPublicUrl } from "@/lib/storage/r2";
import type { ActionState } from "./types";

function parseDocumentForm(formData: FormData) {
  return documentSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    version: formData.get("version") || undefined,
    status: formData.get("status") ?? ContentStatus.DRAFT,
    featured: formData.get("featured") === "on",
    isPublic: formData.get("isPublic") !== "off", // default true unless explicitly toggled off
  });
}

async function createDocumentActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.LIBRARIAN);
  const parsed = parseDocumentForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const objectKey = formData.get("objectKey");
  const mimeType = formData.get("mimeType");
  const fileSize = formData.get("fileSize");
  if (typeof objectKey !== "string" || !objectKey || typeof mimeType !== "string" || !mimeType) {
    return { error: "Please upload a file before saving." };
  }

  await createDocument(
    parsed.data,
    {
      objectKey,
      publicUrl: parsed.data.isPublic ? buildPublicUrl(objectKey) : null,
      mimeType,
      fileSize: Number(fileSize) || 0,
    },
    admin.id,
  );

  revalidatePath("/library");
  revalidatePath("/admin/library");
  redirect("/admin/library");
}

async function updateDocumentActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.LIBRARIAN);
  const parsed = parseDocumentForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = parsed.data.id;
  if (!id) return { error: "Missing document id." };

  await updateDocumentMetadata(id, parsed.data);
  revalidatePath("/library");
  revalidatePath("/admin/library");
  return {};
}

async function deleteDocumentActionImpl(id: string): Promise<void> {
  await requireAdminRole(AdminRole.LIBRARIAN);
  await deleteDocument(id);
  revalidatePath("/library");
  revalidatePath("/admin/library");
}

/**
 * Resolves the URL a visitor should be sent to for a download: a direct
 * public URL for public documents, or a short-lived signed URL (checked
 * against publish status) for private ones. Also records the download.
 */
async function getDocumentDownloadUrlActionImpl(documentId: string): Promise<string> {
  const document = await getPublishedDocument(documentId);
  if (!document) throw new Error("Document not found or not published.");

  await incrementDownloadCount(documentId);

  if (document.isPublic && document.publicUrl) {
    return document.publicUrl;
  }
  return getPresignedDownloadUrl(document.r2ObjectKey, 300);
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const createDocumentAction = withActionErrorHandling("createDocumentAction", createDocumentActionImpl);
export const updateDocumentAction = withActionErrorHandling("updateDocumentAction", updateDocumentActionImpl);
export const deleteDocumentAction = withVoidActionErrorHandling("deleteDocumentAction", deleteDocumentActionImpl);
export const getDocumentDownloadUrlAction = withTypedActionErrorHandling("getDocumentDownloadUrlAction", getDocumentDownloadUrlActionImpl);
