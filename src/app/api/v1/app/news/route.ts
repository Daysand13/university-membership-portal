import { type NextRequest } from "next/server";
import { appJson } from "@/lib/api/app-request";
import { newsSummary, pageFrom, pageInfo, pageSizeFrom } from "@/lib/api/app-shapes";
import { listPublishedNews } from "@/lib/services/news-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The news list, for the app's feed.
 *
 * Open without signing in, exactly as the website's news page is. Only
 * PUBLISHED articles come out of listPublishedNews, which is the same call
 * the website makes — a draft cannot leak through here without leaking on
 * the website first.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await listPublishedNews({
    page: pageFrom(params.get("page")),
    pageSize: pageSizeFrom(params.get("pageSize")),
    categorySlug: params.get("category") ?? undefined,
    search: params.get("q") ?? undefined,
    // Newest first. The website pins featured articles to the top of its
    // news page, which is right for a page somebody browses — but in a feed
    // it buries the thing they opened the app to read underneath whatever
    // was pinned last term.
    order: "newest",
  });

  return appJson({
    news: result.items.map(newsSummary),
    ...pageInfo(result),
  });
}
