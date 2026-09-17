import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordDonation } from "@/lib/services/patron-finance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Paystack sends a patron back after giving. Like the dues callback,
 * this is the fast path for the patron's own page; the webhook records the
 * donation even if the browser never comes back.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const financesUrl = new URL("/patrons/dashboard/finances", request.nextUrl.origin);

  if (!reference) {
    financesUrl.searchParams.set("donation", "error");
    return NextResponse.redirect(financesUrl);
  }

  const result = await verifyAndRecordDonation(reference);
  financesUrl.searchParams.set("donation", result.ok ? result.status.toLowerCase() : "error");
  return NextResponse.redirect(financesUrl);
}
