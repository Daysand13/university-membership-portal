import { type NextRequest } from "next/server";
import { appJson } from "@/lib/api/app-request";
import { eventSummary, pageFrom, pageInfo, pageSizeFrom } from "@/lib/api/app-shapes";
import { listPublishedEvents } from "@/lib/services/event-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Events, upcoming by default and past on request. Open to everyone. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const when = params.get("when") === "past" ? "past" : "upcoming";

  const result = await listPublishedEvents({
    when,
    page: pageFrom(params.get("page")),
    pageSize: pageSizeFrom(params.get("pageSize")),
  });

  const now = new Date();
  return appJson({
    when,
    events: result.items.map((row) => eventSummary(row, now)),
    ...pageInfo(result),
  });
}
