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
  });

  return appJson({
    news: result.items.map(newsSummary),
    ...pageInfo(result),
  });
}
