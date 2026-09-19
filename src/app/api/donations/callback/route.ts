import { NextRequest, NextResponse } from "next/server";
import { verifyAndRecordDonation } from "@/lib/services/patron-finance-service";
import { getDonationPortalPath } from "@/lib/services/alumni-giving-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Paystack sends a donor back after giving. Like the dues callback,
 * this is the fast path for the donor's own page; the webhook records the
 * donation even if the browser never comes back.
 *
 * Patrons and graduates give through the same Paystack flow, so which
 * portal to return to is decided by the donation itself rather than by two
 * separate callback URLs that could drift apart.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");

  if (!reference) {
    const url = new URL("/patrons/dashboard/finances", request.nextUrl.origin);
    url.searchParams.set("donation", "error");
    return NextResponse.redirect(url);
  }

  const [result, path] = await Promise.all([
    verifyAndRecordDonation(reference),
    // Gifts from the public pages carry ?return=<page> on the callback URL;
    // it only ever selects from a fixed list of pages.
    getDonationPortalPath(reference, request.nextUrl.searchParams.get("return")),
  ]);
  const url = new URL(path, request.nextUrl.origin);
  url.searchParams.set("donation", result.ok ? result.status.toLowerCase() : "error");
  // Land back on the part of the page the gift was made from.
  if (path === "/allies" || path === "/assistive-technology") url.hash = "donate";
  return NextResponse.redirect(url);
}
