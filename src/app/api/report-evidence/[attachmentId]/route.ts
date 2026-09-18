import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getCurrentMember } from "@/lib/auth/member";
import { getReportEvidence } from "@/lib/services/barrier-report-service";
import { getPresignedDownloadUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a photo or voice note attached to a barrier report, through a
 * short-lived signed link.
 *
 * Unlike a broadcast's attachment, this never becomes public: only the
 * student who filed the report and administrators can open one, and there
 * is no "sent to everyone" state that would widen that. A signed-out
 * request, or a student asking for someone else's evidence, gets the same
 * 404 — it doesn't confirm the file exists.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await params;
  const [admin, member] = await Promise.all([getCurrentAdmin(), getCurrentMember()]);
  if (!admin && !member) {
    return new NextResponse("Please sign in to open this.", { status: 401, headers: { "Content-Type": "text/plain" } });
  }

  const evidence = await getReportEvidence({
    attachmentId,
    viewer: admin ? { kind: "admin" } : { kind: "member", memberId: member!.id },
  });
  if (!evidence) {
    return new NextResponse("This attachment isn't available.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const url = await getPresignedDownloadUrl(evidence.objectKey, 600);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
