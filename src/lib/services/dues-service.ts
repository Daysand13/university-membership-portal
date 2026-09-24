import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Member } from "@/generated/prisma/client";
import {
  isPaystackConfigured,
  initializeTransaction,
  verifyTransaction,
} from "@/lib/services/paystack-client";
import { notifyCashDuesPaymentRemoved, notifyDuesPaymentReceived } from "@/lib/services/account-notification-service";
import { ON_THE_ROLL } from "@/lib/services/membership-roll";

/**
 * Yearly membership dues, charged through Paystack.
 *
 * There is no "has this member paid" flag anywhere — it is always a query
 * (a SUCCESS row for the current academic year). That is deliberate: a flag
 * would need to be reset every year by someone remembering to do it, and a
 * missed reset silently carries last year's "paid" into a year nobody
 * charged for. A query re-evaluates itself for free every time it's asked.
 */

const PESEWAS_PER_CEDI = 100;

/** Fee schedule as agreed — everything is in whole cedis here for
 *  readability; converted to pesewas at the one place that needs it. */
const FEE_SCHEDULE = {
  fresherOrPgFirstYear: 60 * PESEWAS_PER_CEDI,
  continuing: 50 * PESEWAS_PER_CEDI,
  executive: 70 * PESEWAS_PER_CEDI,
} as const;

/**
 * The Ghanaian academic year runs roughly September to August, so a
 * payment made in, say, March 2027 is still for the "2026/2027" year.
 * August is the cutover: from August onward it counts as the start of the
 * NEXT academic year, matching when re-enrollment for a new level/year
 * actually happens.
 */
export function getCurrentAcademicYear(referenceDate: Date = new Date()): string {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-indexed; 7 = August
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

export interface DuesFee {
  amountPesewas: number;
  tierLabel: string;
}

/**
 * Whether this member's account is linked to an active Leadership listing
 * on the public Team page — the thing that makes them an "executive" for
 * billing purposes. Deliberately does NOT look at PATRON entries; patrons
 * aren't members paying dues.
 */
async function isLinkedExecutive(memberId: string): Promise<boolean> {
  const link = await db.teamMember.findFirst({
    where: { memberId, type: "LEADERSHIP", isActive: true },
    select: { id: true },
  });
  return link !== null;
}

/**
 * Works out what this specific member owes, in this priority order:
 * linked executive overrides everything else, then track + level. A member
 * with no `applicationTrack` recorded (only possible on very old rows) is
 * treated as undergraduate, matching how the rest of the codebase already
 * handles that field being nullable on legacy data.
 */
export async function getDuesFeeForMember(
  member: Pick<Member, "id" | "applicationTrack" | "level">,
): Promise<DuesFee> {
  if (await isLinkedExecutive(member.id)) {
    return { amountPesewas: FEE_SCHEDULE.executive, tierLabel: "Executive" };
  }

  if (member.applicationTrack === "POSTGRADUATE") {
    if (member.level === "Year 1") {
      return { amountPesewas: FEE_SCHEDULE.fresherOrPgFirstYear, tierLabel: "Postgraduate — First Year" };
    }
    return { amountPesewas: FEE_SCHEDULE.continuing, tierLabel: "Postgraduate — Continuing" };
  }

  if (member.level === "Level 100") {
    return { amountPesewas: FEE_SCHEDULE.fresherOrPgFirstYear, tierLabel: "Level 100 (Fresher)" };
  }
  return { amountPesewas: FEE_SCHEDULE.continuing, tierLabel: member.level };
}

/** The most recent payment attempt for this member and academic year, or
 *  null if none has ever been started. */
export async function getLatestDuesPayment(memberId: string, academicYear: string) {
  return db.duesPayment.findFirst({
    where: { memberId, academicYear },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasPaidDuesForYear(memberId: string, academicYear: string): Promise<boolean> {
  const paid = await db.duesPayment.findFirst({
    where: { memberId, academicYear, status: "SUCCESS" },
    select: { id: true },
  });
  return paid !== null;
}

/**
 * Every payment attempt this member has made, newest first, for their Dues &
 * Payments page. Failed and abandoned attempts are included and labelled as
 * such, so someone whose checkout failed can see that nothing went through.
 */
export async function listDuesPaymentsForMember(memberId: string) {
  return db.duesPayment.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export type InitiateDuesPaymentResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; error: string };

/**
 * Creates a PENDING DuesPayment row and asks Paystack for a checkout URL.
 *
 * The row is created BEFORE the Paystack call, with its reference already
 * decided, specifically so the callback and the webhook — which only carry
 * a reference — have something to look up regardless of which of them
 * arrives first, or whether the browser redirect completes at all.
 */
export async function initiateDuesPayment(params: {
  member: Pick<Member, "id" | "email" | "applicationTrack" | "level">;
  callbackUrl: string;
}): Promise<InitiateDuesPaymentResult> {
  const { member, callbackUrl } = params;

  if (!isPaystackConfigured()) {
    return {
      ok: false,
      error: "Online payment isn't set up yet. Please check back soon, or contact the association about paying dues.",
    };
  }

  const academicYear = getCurrentAcademicYear();

  if (await hasPaidDuesForYear(member.id, academicYear)) {
    return { ok: false, error: `Dues for ${academicYear} are already paid.` };
  }

  const fee = await getDuesFeeForMember(member);
  const reference = `dues-${randomUUID()}`;

  await db.duesPayment.create({
    data: {
      memberId: member.id,
      academicYear,
      tierLabel: fee.tierLabel,
      amountPesewas: fee.amountPesewas,
      reference,
      status: "PENDING",
    },
  });

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: member.email,
      amountPesewas: fee.amountPesewas,
      reference,
      callbackUrl,
      metadata: { memberId: member.id, academicYear, tierLabel: fee.tierLabel },
    });
    return { ok: true, authorizationUrl };
  } catch (err) {
    console.error("[dues] failed to start Paystack transaction", err);
    // The row is left PENDING rather than deleted — it's real evidence an
    // attempt was made, and it isn't in anyone's way (a retry gets its own
    // reference).
    return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
  }
}

export type VerifyDuesPaymentResult =
  | { ok: true; status: "SUCCESS"; academicYear: string }
  | { ok: true; status: "FAILED"; academicYear: string }
  | { ok: false; error: string };

/**
 * Asks Paystack what really happened to a reference and records it.
 *
 * Called from both the browser-redirect callback and the webhook, and
 * written to be safe either way: if the payment row is already SUCCESS
 * (the other path got there first), this returns that outcome without
 * writing anything a second time. The amount Paystack reports is checked
 * against what was actually charged — a mismatch is treated as a failure
 * rather than trusted, the same way a client-submitted price never is.
 */
export async function verifyAndRecordDuesPayment(reference: string): Promise<VerifyDuesPaymentResult> {
  const payment = await db.duesPayment.findUnique({ where: { reference } });
  if (!payment) {
    return { ok: false, error: "No payment found for that reference." };
  }

  if (payment.status === "SUCCESS") {
    return { ok: true, status: "SUCCESS", academicYear: payment.academicYear };
  }

  let verified;
  try {
    verified = await verifyTransaction(reference);
  } catch (err) {
    console.error("[dues] verification call failed for", reference, err);
    return { ok: false, error: "We couldn't confirm this payment with Paystack. Please try again shortly." };
  }

  const genuinelySucceeded = verified.status === "success" && verified.amountPesewas === payment.amountPesewas;

  if (genuinelySucceeded) {
    // Guarded by the WHERE on status: if the webhook and the callback race
    // each other here, only the first one's update actually changes a row,
    // so only the first writes the audit log below.
    const paidAt = new Date();
    const { count } = await db.duesPayment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", paidAt, paystackTransactionId: String(verified.transactionId) },
    });
    if (count > 0) {
      // Inside the same "only the first writer" guard as the audit entry,
      // so the webhook and the callback racing each other can't send the
      // member two receipts.
      await notifyDuesPaymentReceived({
        memberId: payment.memberId,
        paymentId: payment.id,
        academicYear: payment.academicYear,
        tierLabel: payment.tierLabel,
        amountLabel: formatPesewasAsCedis(payment.amountPesewas),
        reference,
        paidAt,
      });
      await db.auditLog.create({
        data: {
          action: "DUES_PAYMENT_SUCCESS",
          entityType: "DuesPayment",
          entityId: payment.id,
          newValue: {
            memberId: payment.memberId,
            academicYear: payment.academicYear,
            tierLabel: payment.tierLabel,
            amountPesewas: payment.amountPesewas,
            reference,
          },
        },
      });
    }
    return { ok: true, status: "SUCCESS", academicYear: payment.academicYear };
  }

  if (verified.status !== "success" && payment.status !== "FAILED") {
    await db.duesPayment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "FAILED" },
    });
  }
  return { ok: true, status: "FAILED", academicYear: payment.academicYear };
}

export function formatPesewasAsCedis(amountPesewas: number): string {
  return `GHS ${(amountPesewas / PESEWAS_PER_CEDI).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Cash payments
// ---------------------------------------------------------------------------

/**
 * Some members pay the association in cash. An administrator records that
 * as a SUCCESS payment like any other, so every "has this member paid"
 * check (the dashboard, the dues list, the Paystack button) treats it the
 * same. It's told apart from an online payment by its reference, which
 * Paystack payments never start with.
 */
const CASH_REFERENCE_PREFIX = "CASH-";

export function isCashDuesReference(reference: string): boolean {
  return reference.startsWith(CASH_REFERENCE_PREFIX);
}

/** The summary says what was recorded and who was emailed, for the confirmation the admin sees. */
export type CashDuesResult = { ok: true; summary: string } | { ok: false; error: string };

export async function recordCashDuesPayment(params: { memberId: string; adminId: string }): Promise<CashDuesResult> {
  const { memberId, adminId } = params;
  const academicYear = getCurrentAcademicYear();

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      applicationTrack: true,
      level: true,
      status: true,
      alumniProfile: { select: { id: true } },
    },
  });
  if (!member) return { ok: false, error: "That member no longer exists." };
  if (member.status !== "ACTIVE" || member.alumniProfile) {
    return { ok: false, error: "Dues can only be recorded for a current, active member." };
  }
  if (await hasPaidDuesForYear(memberId, academicYear)) {
    return { ok: false, error: `This member's dues for ${academicYear} are already paid.` };
  }

  const fee = await getDuesFeeForMember(member);
  const reference = `${CASH_REFERENCE_PREFIX}${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const paidAt = new Date();

  const payment = await db.duesPayment.create({
    data: {
      memberId,
      academicYear,
      tierLabel: fee.tierLabel,
      amountPesewas: fee.amountPesewas,
      reference,
      status: "SUCCESS",
      paidAt,
    },
  });
  await db.auditLog.create({
    data: {
      adminId,
      action: "DUES_CASH_PAYMENT_RECORDED",
      entityType: "DuesPayment",
      entityId: payment.id,
      newValue: { memberId, academicYear, tierLabel: fee.tierLabel, amountPesewas: fee.amountPesewas, reference },
    },
  });
  await notifyDuesPaymentReceived({
    memberId,
    paymentId: payment.id,
    academicYear,
    tierLabel: fee.tierLabel,
    amountLabel: formatPesewasAsCedis(fee.amountPesewas),
    reference,
    paidAt,
    method: "cash",
  });
  return {
    ok: true,
    summary: `${formatPesewasAsCedis(fee.amountPesewas)} recorded for ${member.firstName} ${member.lastName} (${academicYear}). A receipt has been emailed to ${member.email}.`,
  };
}

/**
 * Takes back a cash payment recorded by mistake. Only cash payments: an
 * online payment is real money Paystack holds, and deleting its record here
 * wouldn't refund anyone. The audit log keeps what was removed.
 */
export async function removeCashDuesPayment(params: { paymentId: string; adminId: string }): Promise<CashDuesResult> {
  const { paymentId, adminId } = params;
  const payment = await db.duesPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, error: "That payment has already been removed." };
  if (!isCashDuesReference(payment.reference)) {
    return { ok: false, error: "Only cash payments can be removed here. Online payments are handled through Paystack." };
  }

  const { count } = await db.duesPayment.deleteMany({ where: { id: paymentId } });
  if (count === 0) return { ok: false, error: "That payment has already been removed." };

  await db.auditLog.create({
    data: {
      adminId,
      action: "DUES_CASH_PAYMENT_REMOVED",
      entityType: "DuesPayment",
      entityId: payment.id,
      previousValue: {
        memberId: payment.memberId,
        academicYear: payment.academicYear,
        tierLabel: payment.tierLabel,
        amountPesewas: payment.amountPesewas,
        reference: payment.reference,
        paidAt: payment.paidAt?.toISOString() ?? null,
      },
    },
  });
  await notifyCashDuesPaymentRemoved({
    memberId: payment.memberId,
    paymentId: payment.id,
    academicYear: payment.academicYear,
    amountLabel: formatPesewasAsCedis(payment.amountPesewas),
    reference: payment.reference,
  });
  return {
    ok: true,
    summary: `The ${formatPesewasAsCedis(payment.amountPesewas)} cash payment for ${payment.academicYear} has been removed, and the member has been emailed about the correction.`,
  };
}

export interface MemberDuesRow {
  memberId: string;
  fullName: string;
  indexNumber: string;
  level: string;
  applicationTrack: string | null;
  fee: DuesFee;
  paid: boolean;
  paidAt: Date | null;
  /** The payment that settled this year, if any. */
  payment: { id: string; amountPesewas: number; method: "online" | "cash" } | null;
}

export interface DuesFilter {
  status?: "paid" | "unpaid";
  /** A name or an index number, whole or part. */
  search?: string;
}

/**
 * Narrowing the register down to the person in front of you.
 *
 * Done here rather than in the page so the ledger that downloads is
 * always the rows that were on screen — an officer who filters to the
 * unpaid and then presses Download expects the unpaid, not everybody.
 *
 * Filtering in memory rather than in SQL because the whole year's roll is
 * already loaded to work each member's fee out: the fee depends on whether
 * they hold office, which is not a column to filter against.
 */
export function filterDuesRows(rows: MemberDuesRow[], filter: DuesFilter): MemberDuesRow[] {
  const term = filter.search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.status === "paid" && !row.paid) return false;
    if (filter.status === "unpaid" && row.paid) return false;
    if (!term) return true;
    return row.fullName.toLowerCase().includes(term) || row.indexNumber.toLowerCase().includes(term);
  });
}

/** What the filters come to in words, for the top of the printed ledger. */
export function describeDuesFilter(filter: DuesFilter): string {
  const parts: string[] = [];
  if (filter.status === "paid") parts.push("Paid only");
  if (filter.status === "unpaid") parts.push("Unpaid only");
  if (filter.search?.trim()) parts.push(`Matching "${filter.search.trim()}"`);
  return parts.length ? `Filters applied — ${parts.join(" · ")}` : "";
}

/**
 * How much of this year's dues is in: how many students who owe them have
 * paid. Two counts rather than the full per-member pass below, because the
 * dashboard shows this on every page load.
 */
export async function getDuesCollectionRate(academicYear: string): Promise<{
  owing: number;
  paid: number;
  percent: number;
}> {
  const [owing, paidMembers] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE", ...ON_THE_ROLL } }),
    db.duesPayment.findMany({
      where: { academicYear, status: "SUCCESS", member: { status: "ACTIVE", ...ON_THE_ROLL } },
      select: { memberId: true },
      distinct: ["memberId"],
    }),
  ]);
  const paid = paidMembers.length;
  return { owing, paid, percent: owing === 0 ? 0 : Math.round((paid / owing) * 100) };
}

/**
 * Every current member alongside whether they've paid dues for the given
 * academic year — the admin-facing view behind /admin/dues. Built as one
 * pass over the member list (fee is computed per member, same as the
 * dashboard) rather than a SQL join, since the fee itself depends on the
 * executive lookup, which isn't a column to join against.
 *
 * Who owes dues is ACTIVE status AND still on the roll (ON_THE_ROLL in
 * membership-roll.ts) — the same rule /admin/members and the dashboard's
 * Total Members card use, so all three agree. An alumnus studying again is
 * an enrolled student and owes dues like any other; a member who has
 * graduated no longer does.
 */
export async function listMemberDuesStatus(academicYear: string): Promise<MemberDuesRow[]> {
  const [members, successfulPayments] = await Promise.all([
    db.member.findMany({
      where: { status: "ACTIVE", ...ON_THE_ROLL },
      select: { id: true, firstName: true, middleName: true, lastName: true, indexNumber: true, level: true, applicationTrack: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.duesPayment.findMany({
      where: { academicYear, status: "SUCCESS" },
      select: { id: true, memberId: true, paidAt: true, amountPesewas: true, reference: true },
    }),
  ]);

  const paymentByMemberId = new Map(successfulPayments.map((p) => [p.memberId, p]));

  return Promise.all(
    members.map(async (member) => {
      const fee = await getDuesFeeForMember(member);
      const payment = paymentByMemberId.get(member.id) ?? null;
      return {
        memberId: member.id,
        fullName: [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" "),
        indexNumber: member.indexNumber,
        level: member.level,
        applicationTrack: member.applicationTrack,
        fee,
        paid: payment !== null,
        paidAt: payment?.paidAt ?? null,
        payment: payment
          ? {
              id: payment.id,
              amountPesewas: payment.amountPesewas,
              method: isCashDuesReference(payment.reference) ? "cash" : "online",
            }
          : null,
      };
    }),
  );
}
