import { type NextRequest } from "next/server";
import { appError, appJson, requireAppAudience } from "@/lib/api/app-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A signed address to put one piece of barrier-report evidence, and the
 * ticket to send with the report - the website's /api/student/upload/ticket
 * for the app. Only "barrier-evidence" is issued here, only to a signed-in
 * student, under the same per-student rate limit.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;

  const limit = await checkRateLimit(`student-upload:${auth.actor.member.id}`, { max: 40, windowSeconds: 3600 });
  if (!limit.allowed) return appError("You've uploaded a lot of files in a short time. Please wait a while and try again.", 429, "rate_limited");

  const input = parseEnrollmentTicketRequest(await request.json().catch(() => null), ["barrier-evidence"]);
  if (!input) return appError("That upload request was incomplete. Please attach the file again.", 400);

  try {
    const ticket = await requestEnrollmentUpload(input);
    if (!ticket.ok) return appError(ticket.error, 400, "upload_refused");
    return appJson(ticket.mode === "upload" ? { mode: "upload", uploadUrl: ticket.uploadUrl, token: ticket.token } : { mode: "skip" });
  } catch (err) {
    console.error("[app-barrier-upload]", err);
    return appError("We couldn't start the upload. Please try again.", 500);
  }
}
