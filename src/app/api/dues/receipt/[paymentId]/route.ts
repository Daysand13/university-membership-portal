import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/member";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { renderDuesReceipt } from "@/lib/services/dues-receipt-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Downloads the PDF receipt for a paid dues payment — the same file the
 * payment email carries, for a member who has lost the email or an admin
 * who needs to print one.
 *
 * Only the member who paid, or an admin who manages dues, can have it. Anyone
 * else gets a 404 rather than a 403, so a payment ID can't be probed for.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const [member, admin, payment] = await Promise.all([
    getCurrentMember(),
    getCurrentAdmin(),
    db.duesPayment.findUnique({ where: { id: paymentId }, select: { memberId: true } }),
  ]);

  const isPayer = Boolean(member && payment && payment.memberId === member.id);
  const isDuesAdmin = Boolean(admin && (admin.role === AdminRole.SUPER_ADMIN || admin.role === AdminRole.MEMBERSHIP_OFFICER));
  if (!payment || (!isPayer && !isDuesAdmin)) {
    return new NextResponse("Receipt not found.", { status: 404 });
  }

  const receipt = await renderDuesReceipt(paymentId);
  if (!receipt) return new NextResponse("There's no receipt for this payment — it hasn't been paid.", { status: 404 });

  return new Response(new Uint8Array(receipt.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
