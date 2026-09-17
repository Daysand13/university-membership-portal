import { NextRequest, NextResponse } from "next/server";
import { getCurrentPatron } from "@/lib/auth/patron";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRED = "Your session has expired. Please sign in again, then attach the file again.";

/**
 * Issues the signed upload ticket for a patron's document (a broadcast
 * attachment or a governance library upload). A route handler rather than a
 * Server Action for the same reason as the enrollment form's: its URL
 * doesn't change between deployments. See enrollment-upload-service for how
 * the ticket is checked when the form is submitted.
 */
export async function POST(request: NextRequest) {
  const patron = await getCurrentPatron();
  if (!patron) return NextResponse.json({ ok: false, error: SESSION_EXPIRED }, { status: 401 });

  const limit = await checkRateLimit(`patron-upload:${patron.id}`, { max: 40, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "You've uploaded a lot of files in a short time. Please wait a while and try again." },
      { status: 429 },
    );
  }

  const input = parseEnrollmentTicketRequest(await request.json().catch(() => null), ["patron-document"]);
  if (!input) {
    return NextResponse.json({ ok: false, error: "That upload request was incomplete. Please attach the file again." }, { status: 400 });
  }

  try {
    return NextResponse.json(await requestEnrollmentUpload(input), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[patron-upload-ticket] could not issue a ticket", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
