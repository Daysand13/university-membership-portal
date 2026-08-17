import type { Metadata } from "next";
import { NewsCard } from "@/components/news/NewsCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/Common";
import { Pagination } from "@/components/ui/Common";
import { listPublishedNews, listNewsCategories } from "@/lib/services/news-service";
import { Newspaper } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, totalPages }, categories] = await Promise.all([
    listPublishedNews({ page, categorySlug: params.category, search: params.q }),
    listNewsCategories(),
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
          <SectionHeading kicker="Stay Informed" title="News" description="Announcements and updates from the association." />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/news"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${
                !params.category ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
              }`}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/news?category=${cat.slug}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Newspaper size={28} />}
            title="No news articles found"
            description="Check back soon, or try a different category."
          />
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath={`/news${queryPrefix ? `?${queryPrefix}` : ""}`} />
      </div>
    </div>
  );
}
