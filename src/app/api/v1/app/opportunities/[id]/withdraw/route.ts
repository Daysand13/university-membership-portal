import { type NextRequest } from "next/server";
import { appError, appJson, requireAppAudience } from "@/lib/api/app-request";
import { withdrawOpportunity } from "@/lib/services/opportunity-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A graduate taking back an opening still waiting for approval - only their own. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppAudience(request, "ALUMNI");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const withdrawn = await withdrawOpportunity({ alumniId: auth.actor.alumni.id, id });
  if (!withdrawn) return appError("That opening can't be withdrawn: it has already been reviewed, or it isn't yours.", 409, "not_withdrawable");
  return appJson({ withdrawn: true });
}
