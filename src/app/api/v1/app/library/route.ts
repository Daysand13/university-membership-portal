import { type NextRequest } from "next/server";
import { appJson } from "@/lib/api/app-request";
import { pageFrom, pageInfo, pageSizeFrom } from "@/lib/api/app-shapes";
import { listDocumentCategories, listPublishedDocuments } from "@/lib/services/document-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The public library.
 *
 * listPublishedDocuments returns only PUBLISHED documents whose audience
 * is PUBLIC, so nothing meant for patrons or kept private reaches here —
 * the same call the website's library page makes.
 *
 * The file itself is not sent. Each row carries the address it can be
 * fetched from, and the app hands that to Android rather than pulling
 * every document onto somebody's phone.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const [result, categories] = await Promise.all([
    listPublishedDocuments({
      page: pageFrom(params.get("page")),
      pageSize: pageSizeFrom(params.get("pageSize")),
      categorySlug: params.get("category") ?? undefined,
      search: params.get("q") ?? undefined,
    }),
    listDocumentCategories(),
  ]);

  return appJson({
    documents: result.items.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category?.name ?? null,
      categorySlug: doc.category?.slug ?? null,
      // publicUrl is what the website links to; without one the document
      // has no address a phone could open, so it is left out rather than
      // shown as a download that cannot happen.
      fileUrl: doc.publicUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      version: doc.version,
      downloadCount: doc.downloadCount,
      featured: doc.featured,
      addedAt: doc.createdAt.toISOString(),
    })),
    categories: categories.map((category) => ({ name: category.name, slug: category.slug })),
    ...pageInfo(result),
  });
}
