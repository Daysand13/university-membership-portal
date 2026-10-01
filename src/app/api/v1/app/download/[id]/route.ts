import { NextResponse, type NextRequest } from "next/server";
import { appError } from "@/lib/api/app-request";
import { signedDownloadFor } from "@/lib/services/app-release-service";
import { checkRateLimit, clientIpFrom, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Downloading a published build of the app.
 *
 * The file is never streamed through here — a 100MB response is far past
 * what the platform allows. This forwards the phone to Cloudflare's main
 * storage endpoint with a link signed for an hour, which is not rate-limited
 * the way the public r2.dev address is (see downloadAddressFor).
 *
 * Open without signing in, like the version check: an app too old to sign
 * in must still be able to update itself. What it hands out is no secret —
 * the same file anybody can be sent by hand — and the phone checks its
 * SHA-256 against the published one before it does anything with it.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Generous: a campus shares one address, and this is one cheap redirect.
  const limit = await checkRateLimit(`app-download:ip:${clientIpFrom(request.headers)}`, { max: 120, windowSeconds: 3600 });
  if (!limit.allowed) return appError(RATE_LIMIT_MESSAGE, 429, "rate_limited");

  const { id } = await params;
  try {
    const target = await signedDownloadFor(id);
    if (!target) return appError("That version of the app isn't available.", 404, "not_found");
    return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[app-download]", err);
    return appError("The download couldn't be started. Please try again in a moment.", 500);
  }
}
