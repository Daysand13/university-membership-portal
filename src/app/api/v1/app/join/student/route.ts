import { type NextRequest } from "next/server";
import { appError, appFieldErrors, appJson } from "@/lib/api/app-request";
import { enrollStudent } from "@/lib/services/registration-service";
import { checkRateLimit, clientIpFrom, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's application to join, from the app — undergraduate or
 * postgraduate, told apart by `track` exactly as the website's form does.
 *
 * Every check is the website's own (registration-service). The photo and
 * the medical report arrive as the signed tickets /join/upload issued; the
 * stored files are read back and verified here before anything is saved.
 *
 * No hidden-field bot trap, which is meaningless outside a web page. What
 * stands in for it is the medical report: it is required, and a ticket for
 * one can only be had by actually uploading a file through that route.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const limit = await checkRateLimit(`enroll:ip:${ip}`, { max: 30, windowSeconds: 3600 });
  if (!limit.allowed) return appError(RATE_LIMIT_MESSAGE, 429, "rate_limited");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return appError("That application wasn't readable. Please try again.", 400);
  }

  const { profilePictureToken, medicalReportToken, ...fields } = body;
  const outcome = await enrollStudent(fields, {
    passport: typeof profilePictureToken === "string" ? profilePictureToken : "",
    medical: typeof medicalReportToken === "string" ? medicalReportToken : "",
  });

  if (!outcome.ok) {
    if (outcome.fieldErrors && Object.keys(outcome.fieldErrors).length > 0) {
      return appFieldErrors(outcome.fieldErrors, outcome.error);
    }
    return appError(outcome.error ?? "We couldn't submit your application. Please try again in a moment.", 500);
  }

  return appJson({ submitted: true, email: outcome.value.email });
}
