import { type NextRequest } from "next/server";
import { appError, appJson } from "@/lib/api/app-request";
import { eventDetail } from "@/lib/api/app-shapes";
import { getPublishedEventBySlug } from "@/lib/services/event-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) return appError("We couldn't find that event.", 404, "not_found");
  return appJson({ event: eventDetail(event) });
}
