import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson } from "@/lib/api/app-request";
import { signUpPatron } from "@/lib/services/registration-service";
import { checkRateLimit, clientIpFrom, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Somebody offering to support the association, from the app.
 *
 * Not signed in afterwards: a patron is reviewed before they can use the
 * Patrons' Portal, on the website and here alike, and is told by email
 * when they have been approved.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const limit = await checkRateLimit(`patron-register:ip:${ip}`, { max: 10, windowSeconds: 3600 });
  if (!limit.allowed) return appError(RATE_LIMIT_MESSAGE, 429, "rate_limited");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return appError("That form wasn't readable. Please try again.", 400);
  }

  const outcome = await signUpPatron(body);
  if (!outcome.ok) {
    if (outcome.fieldErrors && Object.keys(outcome.fieldErrors).length > 0) {
      return appFieldErrors(outcome.fieldErrors, outcome.error);
    }
    return appError(outcome.error ?? "Something went wrong. Please try again.", 500);
  }

  return appJson({ submitted: true, email: outcome.value.email });
}
