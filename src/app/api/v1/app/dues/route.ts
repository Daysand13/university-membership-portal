import { type NextRequest } from "next/server";
import { appJson, requireAppAudience } from "@/lib/api/app-request";
import {
  formatPesewasAsCedis,
  getCurrentAcademicYear,
  getDuesFeeForMember,
  hasPaidDuesForYear,
  listDuesPaymentsForMember,
} from "@/lib/services/dues-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What a student owes, and what they have paid.
 *
 * Students only: graduates do not pay dues, and a patron is not on the
 * register at all.
 *
 * Read-only. Paying happens through the website's Paystack flow, which is
 * where the callback and the webhook already land — putting a second
 * payment path in the app would mean two places to get a receipt wrong.
 * Failed and abandoned attempts are listed too, so somebody whose checkout
 * fell over can see that nothing went through.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAppAudience(request, "MEMBER");
  if ("response" in auth) return auth.response;
  const { member } = auth.actor;

  const academicYear = getCurrentAcademicYear();
  const [fee, paid, payments] = await Promise.all([
    getDuesFeeForMember(member),
    hasPaidDuesForYear(member.id, academicYear),
    listDuesPaymentsForMember(member.id),
  ]);

  return appJson({
    academicYear,
    fee: {
      amountPesewas: fee.amountPesewas,
      amountLabel: formatPesewasAsCedis(fee.amountPesewas),
      tierLabel: fee.tierLabel,
    },
    paid,
    payments: payments.map((payment) => ({
      id: payment.id,
      academicYear: payment.academicYear,
      amountPesewas: payment.amountPesewas,
      amountLabel: formatPesewasAsCedis(payment.amountPesewas),
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      startedAt: payment.createdAt.toISOString(),
      // The PDF receipt the website already issues, for a payment that went through.
      receiptUrl: payment.status === "SUCCESS" ? `/api/dues/receipt/${payment.id}` : null,
    })),
  });
}
