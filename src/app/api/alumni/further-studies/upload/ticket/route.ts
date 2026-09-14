import { NextRequest, NextResponse } from "next/server";
import { getCurrentAlumni } from "@/lib/auth/alumni";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The enrollment upload ticket for a signed-in alumnus applying for further
 * studies — the same upload flow as api/enrollment/upload/ticket, rate
 * limited by account rather than by address. A route handler rather than a
 * Server Action so a tab left open across a deployment keeps working; see
 * that route for why.
 */
export async function POST(request: NextRequest) {
  const alumni = await getCurrentAlumni();
  if (!alumni) {
    return NextResponse.json({ ok: false, error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const limit = await checkRateLimit(`further-studies-upload:alumni:${alumni.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const input = parseEnrollmentTicketRequest(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "That upload request was incomplete. Please attach the file again." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await requestEnrollmentUpload(input), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[further-studies-upload-ticket] could not issue a ticket", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
