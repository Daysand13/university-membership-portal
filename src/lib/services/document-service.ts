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
    audience: "PUBLIC",
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
  return db.document.findFirst({ where: { id, status: ContentStatus.PUBLISHED, audience: "PUBLIC" } });
}

export async function incrementDownloadCount(id: string) {
  await db.document.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
}

export async function listDocumentCategories() {
  return db.documentCategory.findMany({ orderBy: { name: "asc" } });
}

// --- Admin -------------------------------------------------------------

export async function listDocumentsForAdmin(params?: { search?: string; fromPatrons?: boolean }) {
  return db.document.findMany({
    where: {
      ...(params?.search ? { title: { contains: params.search, mode: "insensitive" } } : {}),
      ...(params?.fromPatrons ? { uploadedByPatronId: { not: null } } : {}),
    },
    include: {
      category: true,
      uploadedBy: { select: { name: true } },
      uploadedByPatron: { select: { id: true, title: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countPatronDraftDocuments(): Promise<number> {
  return db.document.count({ where: { uploadedByPatronId: { not: null }, status: ContentStatus.DRAFT } });
}

export async function getDocumentForAdmin(id: string) {
  return db.document.findUnique({
    where: { id },
    include: { uploadedByPatron: { select: { id: true, title: true, fullName: true, email: true } } },
  });
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
      audience: input.audience,
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
      audience: input.audience,
    },
  });
}

// --- Patrons' Portal ---------------------------------------------------------

/**
 * The governance library patrons see: every published document, whether it
 * was published for everyone or for patrons only.
 */
export async function listPatronLibrary(params?: { categoryId?: string; search?: string }) {
  return db.document.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params?.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" } },
              { description: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true, uploadedByPatron: { select: { title: true, fullName: true } } },
    orderBy: [{ audience: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}

export async function getDocumentForPatron(id: string) {
  return db.document.findFirst({ where: { id, status: ContentStatus.PUBLISHED } });
}

/** A patron's own uploads, whatever their status. */
export async function listPatronUploads(patronId: string) {
  return db.document.findMany({
    where: { uploadedByPatronId: patronId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Saves a patron's upload as a draft for administrators to review. */
export async function createPatronDocument(params: {
  patronId: string;
  title: string;
  description: string | null;
  file: { objectKey: string; mimeType: string; fileSize: number };
}) {
  return db.document.create({
    data: {
      title: params.title,
      description: params.description,
      r2ObjectKey: params.file.objectKey,
      publicUrl: null,
      mimeType: params.file.mimeType,
      fileSize: params.file.fileSize,
      status: ContentStatus.DRAFT,
      isPublic: false,
      audience: "PATRONS",
      uploadedByPatronId: params.patronId,
    },
  });
}

/** A patron may take back an upload the team hasn't published yet. */
export async function deletePatronDraft(params: { patronId: string; documentId: string }): Promise<boolean> {
  const doc = await db.document.findFirst({
    where: { id: params.documentId, uploadedByPatronId: params.patronId, status: ContentStatus.DRAFT },
  });
  if (!doc) return false;
  await deleteDocument(doc.id);
  return true;
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
