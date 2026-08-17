import "server-only";
import { db } from "@/lib/db";
import { ContentStatus, Prisma } from "@/generated/prisma/client";
import { deleteObject } from "@/lib/storage/r2";
import type { DocumentInput } from "@/lib/validations/content";

export async function listPublishedDocuments(params?: {
  categorySlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 12;
  const where: Prisma.DocumentWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(params?.categorySlug ? { category: { slug: params.categorySlug } } : {}),
    ...(params?.search ? { title: { contains: params.search, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    db.document.findMany({
      where,
      include: { category: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.document.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPublishedDocument(id: string) {
  return db.document.findFirst({ where: { id, status: ContentStatus.PUBLISHED } });
}

export async function incrementDownloadCount(id: string) {
  await db.document.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
}

export async function listDocumentCategories() {
  return db.documentCategory.findMany({ orderBy: { name: "asc" } });
}

// --- Admin -------------------------------------------------------------

export async function listDocumentsForAdmin(params?: { search?: string }) {
  return db.document.findMany({
    where: params?.search ? { title: { contains: params.search, mode: "insensitive" } } : {},
    include: { category: true, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentForAdmin(id: string) {
  return db.document.findUnique({ where: { id } });
}

export async function createDocument(
  input: DocumentInput,
  file: { objectKey: string; publicUrl: string | null; mimeType: string; fileSize: number },
  adminId: string,
) {
  return db.document.create({
    data: {
      title: input.title,
      description: input.description || null,
      categoryId: input.categoryId || null,
      r2ObjectKey: file.objectKey,
      publicUrl: file.publicUrl,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      version: input.version || null,
      status: input.status,
      featured: input.featured,
      isPublic: input.isPublic,
      uploadedById: adminId,
    },
  });
}

export async function updateDocumentMetadata(id: string, input: DocumentInput) {
  return db.document.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || null,
      categoryId: input.categoryId || null,
      version: input.version || null,
      status: input.status,
      featured: input.featured,
      isPublic: input.isPublic,
    },
  });
}

export async function deleteDocument(id: string) {
  const doc = await db.document.findUniqueOrThrow({ where: { id } });
  await db.document.delete({ where: { id } });
  // Best-effort cleanup — an orphaned R2 object is a minor storage cost; a
  // failed metadata delete due to a flaky storage API is a worse outcome.
  try {
    await deleteObject(doc.r2ObjectKey);
  } catch (err) {
    console.error("[documents] failed to delete R2 object for", id, err);
  }
}
