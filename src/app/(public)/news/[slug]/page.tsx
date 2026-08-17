import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, User, ChevronLeft } from "lucide-react";
import { RichText } from "@/components/ui/RichText";
import { NewsCard } from "@/components/news/NewsCard";
import { getPublishedNewsBySlug, getRelatedNews } from "@/lib/services/news-service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
      type: "article",
    },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug);
  if (!article) notFound();

  const related = await getRelatedNews(article.id, article.categoryId);

  return (
    <article className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/news" className="inline-flex items-center gap-1 text-sm text-primary-800 font-medium hover:text-accent-600 mb-6">
            <ChevronLeft size={15} /> Back to News
          </Link>
          {article.category && <p className="kicker mb-3">{article.category.name}</p>}
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-950 text-balance leading-tight">
            {article.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> {formatDate(article.publishedAt)}
            </span>
            {article.author?.name && (
              <span className="flex items-center gap-1.5">
                <User size={14} /> {article.author.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {article.coverImageUrl && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full aspect-[16/9] object-cover rounded-lg shadow-md border border-line"
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <RichText html={article.body} />

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="text-xs font-medium bg-surface-muted text-slate px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="bg-surface-muted border-t border-line">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <h2 className="font-display font-bold text-xl text-primary-950 mb-6">More News</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((item) => (
                <NewsCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
