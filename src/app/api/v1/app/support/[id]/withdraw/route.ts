import { type NextRequest } from "next/server";
import { appError, appJson, requireAppAudience } from "@/lib/api/app-request";
import { withdrawSupportRequest } from "@/lib/services/support-request-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Taking back a request nobody has looked at yet - only one's own. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const withdrawn = await withdrawSupportRequest({ memberId: auth.actor.member.id, id });
  if (!withdrawn) return appError("That request can't be withdrawn: it has already been looked at, or it isn't yours.", 409, "not_withdrawable");
  return appJson({ withdrawn: true });
}
