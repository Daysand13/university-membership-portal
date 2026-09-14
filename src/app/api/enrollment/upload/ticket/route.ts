import { NextRequest, NextResponse } from "next/server";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues the signed upload ticket for the PUBLIC enrollment form.
 *
 * A route handler rather than a Server Action on purpose. A Server Action is
 * addressed by an ID that changes with every deployment, so an applicant who
 * opened the form before a deploy — easily done, it's a long form — got
 * "We couldn't start the upload" on every attempt until they reloaded, with
 * nothing telling them to. This URL stays the same across deployments.
 *
 * Deliberately unauthenticated (applicants have no account yet), so rate
 * limited per IP; the limit is generous because a campus shares addresses.
 */
export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`enroll-upload:ip:${ip}`, { max: 60, windowSeconds: 3600 });
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
    console.error("[enroll-upload-ticket] could not issue a ticket", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
