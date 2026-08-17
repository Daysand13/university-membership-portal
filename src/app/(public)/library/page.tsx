import type { Metadata } from "next";
import Link from "next/link";
import { Search, BookOpen } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState, Pagination } from "@/components/ui/Common";
import { DocumentCard } from "@/components/library/DocumentCard";
import { listPublishedDocuments, listDocumentCategories } from "@/lib/services/document-service";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, totalPages }, categories] = await Promise.all([
    listPublishedDocuments({ page, categorySlug: params.category, search: params.q }),
    listDocumentCategories(),
  ]);

  const queryPrefix = [
    params.category ? `category=${params.category}` : "",
    params.q ? `q=${encodeURIComponent(params.q)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  return (
    <div className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <SectionHeading
            kicker="Resource Library"
            title="Documents & Resources"
            description="Official forms, publications, and past materials."
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form className="flex-1 relative" action="/library">
            {params.category && <input type="hidden" name="category" value={params.category} />}
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-light" />
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Search documents…"
              className="w-full rounded-md border border-line bg-white pl-10 pr-4 py-2.5 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
            />
          </form>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/library"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${
                !params.category ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/library?category=${cat.slug}`}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${
                  params.category === cat.slug
                    ? "bg-primary-800 text-white border-primary-800"
                    : "border-line text-slate hover:border-primary-300"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No documents found"
            description="Try a different search term or category."
          />
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath={`/library${queryPrefix ? `?${queryPrefix}` : ""}`} />
      </div>
    </div>
  );
}
