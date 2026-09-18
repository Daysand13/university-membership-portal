import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { parseEnrollmentTicketRequest, requestEnrollmentUpload } from "@/lib/services/enrollment-upload-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRED = "Your admin session has expired. Sign in again in a new tab, then attach the file again.";

/**
 * The signed upload ticket for a file an executive attaches to their own
 * broadcast. Same verified path as a patron's attachment (see
 * enrollment-upload-service) — only the session it requires is different,
 * which is why it can't simply reuse the patrons' route.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: SESSION_EXPIRED }, { status: 401 });

  const limit = await checkRateLimit(`admin-attachment:${admin.id}`, { max: 60, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "You've uploaded a lot of files in a short time. Please wait a while and try again." },
      { status: 429 },
    );
  }

  const input = parseEnrollmentTicketRequest(await request.json().catch(() => null), ["patron-document"]);
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "That upload request was incomplete. Please attach the file again." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await requestEnrollmentUpload(input), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin-attachment-ticket] could not issue a ticket", err);
    return NextResponse.json({ ok: false, error: "We couldn't start the upload. Please try again." }, { status: 500 });
  }
}
