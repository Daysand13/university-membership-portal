import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordDuesPayment } from "@/lib/services/dues-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Paystack sends the browser back after checkout. Paystack calls this
 * `reference` (some integrations also see `trxref` — both are the same
 * value; `reference` is read first since that's what was sent as
 * `callback_url`'s query companion in the initialize call).
 *
 * This is the fast path for the person's own experience, not the source of
 * truth: it's reached only if their browser makes it back here, which
 * doesn't happen if they close the tab right after paying. The webhook
 * (api/webhooks/paystack) is what guarantees the payment gets recorded
 * either way — this route calls the exact same verification function, so
 * whichever one runs first wins and the other is a no-op.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const dashboardUrl = new URL("/membership/dashboard", request.nextUrl.origin);

  if (!reference) {
    dashboardUrl.searchParams.set("dues", "error");
    return NextResponse.redirect(dashboardUrl);
  }

  const result = await verifyAndRecordDuesPayment(reference);
  dashboardUrl.searchParams.set("dues", result.ok ? result.status.toLowerCase() : "error");
  return NextResponse.redirect(dashboardUrl);
}
