import Link from "next/link";
import { CalendarDays, ImageIcon } from "lucide-react";
import type { News, NewsCategory } from "@/generated/prisma/client";

type NewsCardData = News & { category: NewsCategory | null };

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function NewsCard({ article }: { article: NewsCardData }) {
  return (
    <article className="group flex flex-col bg-white rounded-lg border border-line overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <Link href={`/news/${article.slug}`} className="block aspect-[16/10] bg-primary-50 relative overflow-hidden">
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-200">
            <ImageIcon size={32} />
          </div>
        )}
        {article.category && (
          <span className="absolute top-3 left-3 bg-primary-950/85 text-accent-400 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded">
            {article.category.name}
          </span>
        )}
      </Link>
      <div className="flex-1 flex flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-slate mb-2">
          <CalendarDays size={13} />
          {formatDate(article.publishedAt)}
        </div>
        <h3 className="font-display font-bold text-lg leading-snug text-primary-950">
          <Link href={`/news/${article.slug}`} className="hover:text-primary-700">
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-slate leading-relaxed line-clamp-3">{article.excerpt}</p>
        <Link
          href={`/news/${article.slug}`}
          className="mt-4 text-sm font-semibold text-primary-800 hover:text-accent-600 inline-flex items-center gap-1"
        >
          Read more →
        </Link>
      </div>
    </article>
  );
}
