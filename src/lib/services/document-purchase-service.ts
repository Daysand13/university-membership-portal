import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { PaidDocumentKind, type AdminUser, type Member } from "@/generated/prisma/client";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "@/lib/services/paystack-client";

/**
 * Documents the association prepares for a member for a fee.
 *
 * The CV is the first; the ID card is meant to follow, which is why
 * nothing here is written in terms of a CV. A member pays once for a
 * document and can then download it as often as they like — what they are
 * paying for is the association's preparation of it, not a single file,
 * and charging somebody again because their printer jammed would be
 * indefensible.
 *
 * Money is handled exactly as dues are: a row is written before Paystack
 * is called so the callback and the webhook have something to find, and
 * the amount Paystack reports back is checked against what was charged
 * rather than trusted.
 */

const PESEWAS_PER_CEDI = 100;

/**
 * Every document purchase reference starts this way. Donations, dues and
 * these all come back through the one Paystack webhook, and the reference
 * is what tells them apart.
 */
const DOCUMENT_REFERENCE_PREFIX = "doc-";

export function isDocumentPurchaseReference(reference: string): boolean {
  return reference.startsWith(DOCUMENT_REFERENCE_PREFIX);
}

/**
 * What each document costs. Kept here rather than in the database because
 * it is a decision of the executive, not a setting somebody should be able
 * to change by accident — and because every purchase stores the price it
 * was made at, so changing this never rewrites history.
 */
export const DOCUMENT_PRICES: Record<PaidDocumentKind, { pesewas: number; label: string }> = {
  [PaidDocumentKind.CV]: { pesewas: 20 * PESEWAS_PER_CEDI, label: "Curriculum vitae" },
  [PaidDocumentKind.ID_CARD]: { pesewas: 30 * PESEWAS_PER_CEDI, label: "Membership ID card" },
};

export function priceOf(kind: PaidDocumentKind) {
  return DOCUMENT_PRICES[kind];
}

export function formatCedis(pesewas: number): string {
  return `GH₵${(pesewas / PESEWAS_PER_CEDI).toFixed(2)}`;
}

/** Has this member paid for this document? */
export async function hasPaidFor(memberId: string, kind: PaidDocumentKind): Promise<boolean> {
  const paid = await db.documentPurchase.findFirst({
    where: { memberId, kind, status: "SUCCESS" },
    select: { id: true },
  });
  return paid !== null;
}

export async function listPurchases(memberId: string) {
  return db.documentPurchase.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export type StartPurchaseResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

export async function startDocumentPurchase(params: {
  member: Pick<Member, "id" | "email">;
  kind: PaidDocumentKind;
  callbackUrl: string;
}): Promise<StartPurchaseResult> {
  const { member, kind, callbackUrl } = params;

  if (await hasPaidFor(member.id, kind)) {
    return { ok: false, error: "You have already paid for this — it is ready to download." };
  }

  if (!isPaystackConfigured()) {
    return {
      ok: false,
      error:
        "Online payment isn't switched on yet. Pay at the association office and ask them to record it, and it will unlock here.",
    };
  }

  const price = priceOf(kind);
  const reference = `${DOCUMENT_REFERENCE_PREFIX}${kind.toLowerCase()}-${randomUUID()}`;

  await db.documentPurchase.create({
    data: {
      memberId: member.id,
      kind,
      amountPesewas: price.pesewas,
      priceLabel: price.label,
      reference,
      status: "PENDING",
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: member.email,
      amountPesewas: price.pesewas,
      reference,
      callbackUrl,
      metadata: { memberId: member.id, kind },
    });
    return { ok: true, authorizationUrl };
  } catch (err) {
    console.error("[document-purchase] could not start the Paystack transaction", err);
    // The row stays PENDING rather than being deleted: it is evidence an
    // attempt was made, and a retry gets its own reference.
    return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
  }
}

export type VerifyPurchaseResult =
  | { ok: true; status: "SUCCESS" | "FAILED"; kind: PaidDocumentKind }
  | { ok: false; error: string };

/**
 * Asks Paystack what really happened, and records it. Safe to call twice —
 * the browser callback and the webhook both land here, and whichever
 * arrives second finds the work already done.
 */
export async function verifyAndRecordPurchase(reference: string): Promise<VerifyPurchaseResult> {
  const purchase = await db.documentPurchase.findUnique({ where: { reference } });
  if (!purchase) return { ok: false, error: "No payment found for that reference." };
  if (purchase.status === "SUCCESS") return { ok: true, status: "SUCCESS", kind: purchase.kind };

  let result;
  try {
    result = await verifyTransaction(reference);
  } catch (err) {
    console.error("[document-purchase] could not verify with Paystack", err);
    return { ok: false, error: "We couldn't confirm that payment. Please check back shortly." };
  }

  // What was actually charged, not what anybody says was charged.
  const settled = result.status === "success" && result.amountPesewas === purchase.amountPesewas;

  await db.documentPurchase.update({
    where: { id: purchase.id },
    data: {
      status: settled ? "SUCCESS" : "FAILED",
      paystackTransactionId: result.transactionId ? String(result.transactionId) : null,
      paidAt: settled ? new Date() : null,
    },
  });

  return { ok: true, status: settled ? "SUCCESS" : "FAILED", kind: purchase.kind };
}

/**
 * An officer taking the money by hand.
 *
 * Until online payment is switched on this is the only way anybody pays,
 * and it stays useful afterwards: not every student has a mobile money
 * wallet. Who recorded it is kept, and it goes in the audit log.
 */
export async function recordCashDocumentPayment(params: {
  memberId: string;
  kind: PaidDocumentKind;
  admin: Pick<AdminUser, "id">;
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const { memberId, kind, admin } = params;

  if (await hasPaidFor(memberId, kind)) {
    return { ok: false, error: "This member has already paid for that document." };
  }

  const price = priceOf(kind);
  const purchase = await db.documentPurchase.create({
    data: {
      memberId,
      kind,
      amountPesewas: price.pesewas,
      priceLabel: price.label,
      reference: `cash-doc-${kind.toLowerCase()}-${randomUUID()}`,
      status: "SUCCESS",
      paidAt: new Date(),
      recordedById: admin.id,
    },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "RECORD_CASH_DOCUMENT_PAYMENT",
      entityType: "DocumentPurchase",
      entityId: purchase.id,
      newValue: { memberId, kind, amountPesewas: price.pesewas },
    },
  });

  return { ok: true, summary: `${price.label} unlocked — ${formatCedis(price.pesewas)} recorded as cash.` };
}
