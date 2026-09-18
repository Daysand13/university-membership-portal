import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { AlumniProfile, DonationFund } from "@/generated/prisma/client";
import { initializeTransaction, isPaystackConfigured } from "@/lib/services/paystack-client";
import { ONLINE_DONATION_PREFIX } from "@/lib/services/patron-finance-service";
import { DONATION_FUNDS } from "@/lib/patron-portal-options";

/**
 * Alumni giving. The same Donation rows, the same funds and the same
 * Paystack path as the patrons' — a gift is a gift, whoever gives it — with
 * alumniId set instead of patronId so each portal can show a graduate their
 * own giving back.
 *
 * What's different is what an alumnus is shown afterwards: not a donor
 * honour roll but an impact summary, because the question a graduate asks
 * is "did that actually buy anything?"
 */

export type InitiateGivingResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

export async function initiateAlumniDonation(params: {
  alumni: Pick<AlumniProfile, "id" | "email" | "fullName">;
  amountPesewas: number;
  fund: DonationFund;
  anonymous: boolean;
  callbackUrl: string;
}): Promise<InitiateGivingResult> {
  const { alumni, amountPesewas, fund, anonymous, callbackUrl } = params;

  if (!isPaystackConfigured()) {
    return {
      ok: false,
      error:
        "Online giving isn't switched on yet. Please use the bank or Mobile Money details on the Donate page, or contact the association.",
    };
  }

  const reference = `${ONLINE_DONATION_PREFIX}${randomUUID()}`;
  const donation = await db.donation.create({
    data: {
      alumniId: alumni.id,
      donorName: alumni.fullName,
      donorEmail: alumni.email,
      fund,
      amountPesewas,
      anonymous,
      source: "ONLINE",
      status: "PENDING",
      reference,
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: alumni.email,
      amountPesewas,
      reference,
      callbackUrl,
      metadata: { donationId: donation.id, alumniId: alumni.id, fund, kind: "donation" },
    });
    return { ok: true, authorizationUrl };
  } catch (err) {
    console.error("[alumni-giving] failed to start Paystack transaction", err);
    return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
  }
}

export async function listGivingForAlumni(alumniId: string) {
  return db.donation.findMany({
    where: { alumniId, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export interface GivingSummary {
  lifetimePesewas: number;
  giftCount: number;
  firstGiftAt: Date | null;
  byFund: { fund: string; label: string; amountPesewas: number }[];
}

export async function getGivingSummary(alumniId: string): Promise<GivingSummary> {
  const [totals, byFund, first] = await Promise.all([
    db.donation.aggregate({
      where: { alumniId, status: "SUCCESS" },
      _sum: { amountPesewas: true },
      _count: { _all: true },
    }),
    db.donation.groupBy({
      by: ["fund"],
      where: { alumniId, status: "SUCCESS" },
      _sum: { amountPesewas: true },
    }),
    db.donation.findFirst({
      where: { alumniId, status: "SUCCESS" },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
  ]);

  return {
    lifetimePesewas: totals._sum.amountPesewas ?? 0,
    giftCount: totals._count._all,
    firstGiftAt: first?.paidAt ?? null,
    byFund: DONATION_FUNDS.map((f) => ({
      fund: f.value,
      label: f.label,
      amountPesewas: byFund.find((g) => g.fund === f.value)?._sum.amountPesewas ?? 0,
    })).filter((f) => f.amountPesewas > 0),
  };
}

/**
 * What the giving paid for, association-wide: support actually provided to
 * students in the last year. Not a receipt for one person's gift — nobody
 * can honestly say which cedi bought which screen reader — but a truthful
 * answer to "what did the fund do?".
 */
export async function getGivingImpact(): Promise<{
  studentsSupported: number;
  assistiveDevicesFunded: number;
  welfarePaidPesewas: number;
  since: Date;
}> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const [fulfilled, welfare] = await Promise.all([
    db.supportRequest.findMany({
      where: { status: "FULFILLED", fulfilledAt: { gte: since } },
      select: { memberId: true, type: true },
    }),
    db.expense.aggregate({
      where: { category: { in: ["STUDENT_WELFARE", "ASSISTIVE_TECHNOLOGY"] }, spentOn: { gte: since } },
      _sum: { amountPesewas: true },
    }),
  ]);

  return {
    studentsSupported: new Set(fulfilled.map((r) => r.memberId)).size,
    assistiveDevicesFunded: fulfilled.filter((r) => r.type === "ASSISTIVE_TECH").length,
    welfarePaidPesewas: welfare._sum.amountPesewas ?? 0,
    since,
  };
}

/** Where to send a donor back to after Paystack — their own portal. */
export async function getDonationPortalPath(reference: string): Promise<string> {
  const donation = await db.donation.findUnique({ where: { reference }, select: { alumniId: true } });
  return donation?.alumniId ? "/alumni/giving" : "/patrons/dashboard/finances";
}
