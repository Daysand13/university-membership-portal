import { type NextRequest } from "next/server";
import { appError, appJson } from "@/lib/api/app-request";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit, clientIpFrom, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A place to put a passport photo or a medical report, before the
 * application is sent.
 *
 * The same signed, direct-to-storage path the website's enrollment form
 * uses — the phone sends the file straight to storage with the address
 * handed back here, then sends the application with the ticket. The file
 * never passes through this server, which is what keeps a 5MB medical
 * report inside what the platform will accept, and nothing is trusted
 * until the application is sent: the stored bytes are read back and
 * checked then. See enrollment-upload-service.
 *
 * Only the two applicant kinds. Nobody signed in, so rate limited per
 * address, under the website's key — one allowance per address, not two.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const limit = await checkRateLimit(`enroll-upload:ip:${ip}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) return appError(RATE_LIMIT_MESSAGE, 429, "rate_limited");

  const input = parseEnrollmentTicketRequest(await request.json().catch(() => null));
  if (!input) return appError("That upload request was incomplete. Please attach the file again.", 400);

  try {
    const ticket = await requestEnrollmentUpload(input);
    if (!ticket.ok) return appError(ticket.error, 400, "upload_refused");
    return appJson(ticket.mode === "upload" ? { mode: "upload", uploadUrl: ticket.uploadUrl, token: ticket.token } : { mode: "skip" });
  } catch (err) {
    console.error("[app-join-upload]", err);
    return appError("We couldn't start the upload. Please try again.", 500);
  }
}
