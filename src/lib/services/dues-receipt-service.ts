import "server-only";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { getEmailBrand } from "@/lib/services/content-service";
import { formatPesewasAsCedis, isCashDuesReference } from "@/lib/services/dues-service";
import { loadLogoDataUri } from "@/lib/pdf/logo";
import { renderDuesReceiptBuffer } from "@/lib/pdf/DuesReceiptPdf";

export interface DuesReceiptFile {
  filename: string;
  content: Buffer;
}

function siteHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null;
  } catch {
    return null;
  }
}

/**
 * The PDF receipt for one dues payment, or null if there's nothing to
 * receipt: an unknown payment, or one that hasn't succeeded. Only a paid
 * payment ever gets a receipt.
 */
export async function renderDuesReceipt(paymentId: string): Promise<DuesReceiptFile | null> {
  const payment = await db.duesPayment.findUnique({
    where: { id: paymentId },
    include: {
      member: { select: { firstName: true, middleName: true, lastName: true, indexNumber: true, programme: true, level: true } },
    },
  });
  if (!payment || payment.status !== "SUCCESS" || !payment.paidAt) return null;

  const brand = await getEmailBrand();
  const [logoDataUri, universityLogoDataUri] = await Promise.all([
    loadLogoDataUri(brand.logoUrl),
    loadLogoDataUri(brand.universityLogoUrl),
  ]);

  const content = await renderDuesReceiptBuffer({
    reference: payment.reference,
    paidAt: payment.paidAt,
    memberName: formatFullName(payment.member.firstName, payment.member.middleName, payment.member.lastName),
    indexNumber: payment.member.indexNumber,
    programme: payment.member.programme,
    level: payment.member.level,
    academicYear: payment.academicYear,
    tierLabel: payment.tierLabel,
    amountLabel: formatPesewasAsCedis(payment.amountPesewas),
    method: isCashDuesReference(payment.reference) ? "cash" : "online",
    transactionId: payment.paystackTransactionId,
    logoDataUri,
    universityLogoDataUri,
    website: siteHost(),
    generatedAt: new Date(),
  });

  return { filename: `ASSN-UEW-Dues-Receipt-${payment.reference}.pdf`, content };
}
