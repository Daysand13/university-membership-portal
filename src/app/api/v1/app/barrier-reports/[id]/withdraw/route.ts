import { type NextRequest } from "next/server";
import { appError, appJson, requireAppAudience } from "@/lib/api/app-request";
import { withdrawReport } from "@/lib/services/barrier-report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Withdrawing a report nobody has picked up yet - only one's own. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const withdrawn = await withdrawReport({ memberId: auth.actor.member.id, id });
  if (!withdrawn) return appError("That report can't be withdrawn: it is already being looked at, or it isn't yours.", 409, "not_withdrawable");
  return appJson({ withdrawn: true });
}
