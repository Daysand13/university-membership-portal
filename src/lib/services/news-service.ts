import "server-only";
import { db } from "@/lib/db";
import { ContentStatus, Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/validations/content";
import type { NewsInput } from "@/lib/validations/content";

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = slugify(base) || "article";
  let suffix = 1;
  // Small bounded loop: collisions are rare, and this keeps slugs short.
  while (
    await db.news.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${slugify(base)}-${suffix}`;
  }
  return candidate;
}

export async function listPublishedNews(params?: {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  search?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 9;
  const where: Prisma.NewsWhereInput = {
    status: ContentStatus.PUBLISHED,
    ...(params?.categorySlug ? { category: { slug: params.categorySlug } } : {}),
    ...(params?.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" } },
            { excerpt: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.news.findMany({
      where,
      include: { category: true, author: { select: { name: true } } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.news.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getFeaturedNews(limit = 3) {
  return db.news.findMany({
    where: { status: ContentStatus.PUBLISHED },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export async function getPublishedNewsBySlug(slug: string) {
  return db.news.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    include: { category: true, author: { select: { name: true } } },
  });
}

export async function getRelatedNews(newsId: string, categoryId: string | null, limit = 3) {
  return db.news.findMany({
    where: {
      status: ContentStatus.PUBLISHED,
      id: { not: newsId },
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

// --- Admin -------------------------------------------------------------

export async function listNewsForAdmin(params?: { search?: string; status?: ContentStatus }) {
  return db.news.findMany({
    where: {
      status: params?.status,
      ...(params?.search ? { title: { contains: params.search, mode: "insensitive" } } : {}),
    },
    include: { category: true, author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getNewsForAdmin(id: string) {
  return db.news.findUnique({ where: { id } });
}

export async function createNews(input: NewsInput, coverImageUrl: string | null, authorId: string) {
  const slug = await uniqueSlug(input.slug || input.title);
  return db.news.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      body: input.body,
      coverImageUrl,
      categoryId: input.categoryId || null,
      tags: input.tags,
      status: input.status,
      featured: input.featured,
      authorId,
      publishedAt: input.status === ContentStatus.PUBLISHED ? new Date() : null,
    },
  });
}

export async function updateNews(
  id: string,
  input: NewsInput,
  coverImageUrl: string | null | undefined,
) {
  const existing = await db.news.findUniqueOrThrow({ where: { id } });
  const slug = input.slug && input.slug !== existing.slug ? await uniqueSlug(input.slug, id) : existing.slug;

  const becomingPublished = input.status === ContentStatus.PUBLISHED && existing.status !== ContentStatus.PUBLISHED;

  return db.news.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt,
      body: input.body,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      categoryId: input.categoryId || null,
      tags: input.tags,
      status: input.status,
      featured: input.featured,
      publishedAt: becomingPublished ? new Date() : existing.publishedAt,
    },
  });
}

export async function deleteNews(id: string) {
  return db.news.delete({ where: { id } });
}

export async function setNewsStatus(id: string, status: ContentStatus) {
  const existing = await db.news.findUniqueOrThrow({ where: { id } });
  return db.news.update({
    where: { id },
    data: {
      status,
      publishedAt:
        status === ContentStatus.PUBLISHED && !existing.publishedAt ? new Date() : existing.publishedAt,
    },
  });
}

export async function listNewsCategories() {
  return db.newsCategory.findMany({ orderBy: { name: "asc" } });
}
