import { type NextRequest } from "next/server";
import { appError, appJson } from "@/lib/api/app-request";
import { newsArticle, newsSummary } from "@/lib/api/app-shapes";
import { getPublishedNewsBySlug, getRelatedNews } from "@/lib/services/news-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One article, with what to read next — saves the app a second request. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(slug);
  if (!article) return appError("We couldn't find that article.", 404, "not_found");

  const related = await getRelatedNews(article.id, article.categoryId, 3);
  return appJson({ article: newsArticle(article), related: related.map(newsSummary) });
}
