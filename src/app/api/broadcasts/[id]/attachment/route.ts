import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getCurrentPatron } from "@/lib/auth/patron";
import { getBroadcastAttachment } from "@/lib/services/broadcast-service";
import { getPresignedDownloadUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a broadcast's attachment through a short-lived signed link. Once a
 * broadcast has been sent, the link in the email works for everyone it was
 * sent to; before that, only its author and administrators can open it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, patron] = await Promise.all([getCurrentAdmin(), getCurrentPatron()]);
  const viewer = admin
    ? ({ kind: "admin" } as const)
    : patron
      ? ({ kind: "patron", patronId: patron.id } as const)
      : ({ kind: "anyone" } as const);

  const attachment = await getBroadcastAttachment({ broadcastId: id, viewer });
  if (!attachment) {
    return new NextResponse("This attachment isn't available.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  const url = await getPresignedDownloadUrl(attachment.key, 600);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
