import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { PaidDocumentKind, type AdminUser } from "@/generated/prisma/client";
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

/**
 * Who is buying.
 *
 * A student pays for their CV once and it is theirs. A graduate renews
 * yearly, because the association goes on preparing it for them long
 * after they have stopped paying dues — so the same document costs the
 * same money but lasts a different length of time.
 */
export type PurchaseOwner =
  | { kind: "member"; id: string; email: string }
  | { kind: "alumni"; id: string; email: string };

function ownerWhere(owner: PurchaseOwner) {
  return owner.kind === "member" ? { memberId: owner.id } : { alumniProfileId: owner.id };
}

export const ALUMNI_CV_MONTHS = 12;

/** When a purchase stops counting. Null means never. */
export function validUntilFor(owner: PurchaseOwner, kind: PaidDocumentKind, from: Date = new Date()): Date | null {
  if (owner.kind !== "alumni" || kind !== PaidDocumentKind.CV) return null;
  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + ALUMNI_CV_MONTHS);
  return expires;
}

export function priceOf(kind: PaidDocumentKind) {
  return DOCUMENT_PRICES[kind];
}

/** "GH₵20.00, renewed every year" — what the buyer is actually agreeing to. */
export function priceDescription(owner: PurchaseOwner["kind"], kind: PaidDocumentKind): string {
  const price = formatCedis(priceOf(kind).pesewas);
  if (owner === "alumni" && kind === PaidDocumentKind.CV) return `${price} a year`;
  return `${price}, once`;
}

export function formatCedis(pesewas: number): string {
  return `GH₵${(pesewas / PESEWAS_PER_CEDI).toFixed(2)}`;
}

/** Has this person paid for this document, and is that payment still good? */
export async function hasPaidFor(owner: PurchaseOwner, kind: PaidDocumentKind): Promise<boolean> {
  const paid = await db.documentPurchase.findFirst({
    where: {
      ...ownerWhere(owner),
      kind,
      status: "SUCCESS",
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return paid !== null;
}

/** When the current purchase runs out, where it does. */
export async function paidUntil(owner: PurchaseOwner, kind: PaidDocumentKind): Promise<Date | null> {
  const paid = await db.documentPurchase.findFirst({
    where: { ...ownerWhere(owner), kind, status: "SUCCESS", validUntil: { gt: new Date() } },
    orderBy: { validUntil: "desc" },
    select: { validUntil: true },
  });
  return paid?.validUntil ?? null;
}

export async function listPurchases(owner: PurchaseOwner) {
  return db.documentPurchase.findMany({
    where: ownerWhere(owner),
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export type StartPurchaseResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

export async function startDocumentPurchase(params: {
  owner: PurchaseOwner;
  kind: PaidDocumentKind;
  callbackUrl: string;
}): Promise<StartPurchaseResult> {
  const { owner, kind, callbackUrl } = params;

  if (await hasPaidFor(owner, kind)) {
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
      ...ownerWhere(owner),
      kind,
      amountPesewas: price.pesewas,
      priceLabel: price.label,
      reference,
      status: "PENDING",
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: owner.email,
      amountPesewas: price.pesewas,
      reference,
      callbackUrl,
      metadata: { ...ownerWhere(owner), kind },
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

  const paidAt = new Date();
  const owner: PurchaseOwner | null = purchase.memberId
    ? { kind: "member", id: purchase.memberId, email: "" }
    : purchase.alumniProfileId
      ? { kind: "alumni", id: purchase.alumniProfileId, email: "" }
      : null;

  await db.documentPurchase.update({
    where: { id: purchase.id },
    data: {
      status: settled ? "SUCCESS" : "FAILED",
      paystackTransactionId: result.transactionId ? String(result.transactionId) : null,
      paidAt: settled ? paidAt : null,
      // Counted from when the money landed, not from when the checkout was
      // opened — somebody who pays a day later gets their full year.
      validUntil: settled && owner ? validUntilFor(owner, purchase.kind, paidAt) : null,
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
  owner: PurchaseOwner;
  kind: PaidDocumentKind;
  admin: Pick<AdminUser, "id">;
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const { owner, kind, admin } = params;

  if (await hasPaidFor(owner, kind)) {
    return { ok: false, error: "They have already paid for that document." };
  }

  const price = priceOf(kind);
  const paidAt = new Date();
  const purchase = await db.documentPurchase.create({
    data: {
      ...ownerWhere(owner),
      kind,
      amountPesewas: price.pesewas,
      priceLabel: price.label,
      reference: `cash-doc-${kind.toLowerCase()}-${randomUUID()}`,
      status: "SUCCESS",
      paidAt,
      validUntil: validUntilFor(owner, kind, paidAt),
      recordedById: admin.id,
    },
  });

  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "RECORD_CASH_DOCUMENT_PAYMENT",
      entityType: "DocumentPurchase",
      entityId: purchase.id,
      newValue: { ...ownerWhere(owner), kind, amountPesewas: price.pesewas },
    },
  });

  return { ok: true, summary: `${price.label} unlocked — ${formatCedis(price.pesewas)} recorded as cash.` };
}
