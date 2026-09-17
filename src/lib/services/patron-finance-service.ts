import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { DonationFund, ExpenseCategory, PatronProfile } from "@/generated/prisma/client";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "@/lib/services/paystack-client";
import { notifyDonationReceived } from "@/lib/services/patron-portal-notification-service";
import { DONATION_FUNDS, EXPENSE_CATEGORIES } from "@/lib/patron-portal-options";

/**
 * The money side of the Patrons' Portal: patrons' online donations (through
 * Paystack, exactly like dues), donations an administrator records by hand,
 * expenses, and the summaries the finance charts are drawn from.
 */

export const ONLINE_DONATION_PREFIX = "donation-";
const RECORDED_DONATION_PREFIX = "donation-recorded-";

export function isDonationReference(reference: string): boolean {
  return reference.startsWith(ONLINE_DONATION_PREFIX);
}

function patronName(patron: Pick<PatronProfile, "title" | "fullName">): string {
  return [patron.title, patron.fullName].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Online donations
// ---------------------------------------------------------------------------

export type InitiateDonationResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

/**
 * Records a PENDING donation and asks Paystack for a checkout page. As with
 * dues, the row exists before Paystack is called so the callback and the
 * webhook — which only carry the reference — always have something to find.
 */
export async function initiatePatronDonation(params: {
  patron: Pick<PatronProfile, "id" | "email" | "title" | "fullName">;
  amountPesewas: number;
  fund: DonationFund;
  anonymous: boolean;
  callbackUrl: string;
}): Promise<InitiateDonationResult> {
  const { patron, amountPesewas, fund, anonymous, callbackUrl } = params;

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
      patronId: patron.id,
      donorName: patronName(patron),
      donorEmail: patron.email,
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
      email: patron.email,
      amountPesewas,
      reference,
      callbackUrl,
      metadata: { donationId: donation.id, patronId: patron.id, fund, kind: "donation" },
    });
    return { ok: true, authorizationUrl };
  } catch (err) {
    console.error("[donations] failed to start Paystack transaction", err);
    return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
  }
}

export type VerifyDonationResult = { ok: true; status: "SUCCESS" | "FAILED" } | { ok: false; error: string };

/**
 * Confirms with Paystack what happened to a donation and records it. Safe
 * to call from both the callback and the webhook: only the first caller to
 * mark it paid sends the receipt. The amount Paystack reports must match
 * what was asked for.
 */
export async function verifyAndRecordDonation(reference: string): Promise<VerifyDonationResult> {
  const donation = await db.donation.findUnique({
    where: { reference },
    include: { patron: { select: { email: true, title: true, fullName: true } } },
  });
  if (!donation || donation.source !== "ONLINE") return { ok: false, error: "No donation found for that reference." };
  if (donation.status === "SUCCESS") return { ok: true, status: "SUCCESS" };

  let verified;
  try {
    verified = await verifyTransaction(reference);
  } catch (err) {
    console.error("[donations] verification call failed for", reference, err);
    return { ok: false, error: "We couldn't confirm this payment with Paystack. Please try again shortly." };
  }

  if (verified.status === "success" && verified.amountPesewas === donation.amountPesewas) {
    const paidAt = new Date();
    const paystackTransactionId = String(verified.transactionId);
    const { count } = await db.donation.updateMany({
      where: { id: donation.id, status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", paidAt, paystackTransactionId },
    });
    if (count > 0) {
      const donor = donation.patron ?? (donation.donorEmail ? { email: donation.donorEmail, title: null, fullName: donation.donorName } : null);
      if (donor) {
        await notifyDonationReceived({ donor, donation: { ...donation, paidAt, paystackTransactionId } });
      }
      await db.auditLog.create({
        data: {
          action: "DONATION_SUCCESS",
          entityType: "Donation",
          entityId: donation.id,
          newValue: {
            patronId: donation.patronId,
            fund: donation.fund,
            amountPesewas: donation.amountPesewas,
            reference,
          },
        },
      });
    }
    return { ok: true, status: "SUCCESS" };
  }

  if (verified.status !== "success" && donation.status !== "FAILED") {
    await db.donation.updateMany({
      where: { id: donation.id, status: { not: "SUCCESS" } },
      data: { status: "FAILED" },
    });
  }
  return { ok: true, status: "FAILED" };
}

export async function listDonationsForPatron(patronId: string) {
  return db.donation.findMany({
    where: { patronId, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ---------------------------------------------------------------------------
// Admin: donations and expenses
// ---------------------------------------------------------------------------

export async function recordOfflineDonation(params: {
  donorName: string;
  donorEmail: string | null;
  amountPesewas: number;
  fund: DonationFund;
  receivedOn: Date;
  note: string | null;
  anonymous: boolean;
  adminId: string;
}) {
  const donation = await db.donation.create({
    data: {
      donorName: params.donorName,
      donorEmail: params.donorEmail,
      amountPesewas: params.amountPesewas,
      fund: params.fund,
      anonymous: params.anonymous,
      note: params.note,
      source: "RECORDED",
      status: "SUCCESS",
      paidAt: params.receivedOn,
      reference: `${RECORDED_DONATION_PREFIX}${randomUUID()}`,
      recordedById: params.adminId,
    },
  });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "RECORD_DONATION",
      entityType: "Donation",
      entityId: donation.id,
      newValue: { donorName: donation.donorName, amountPesewas: donation.amountPesewas, fund: donation.fund },
    },
  });
  return donation;
}

export class DonationDeleteError extends Error {}

/** Only a hand-recorded donation can be removed; online payments are Paystack's record. */
export async function deleteRecordedDonation(params: { id: string; adminId: string }): Promise<void> {
  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation) throw new DonationDeleteError("That donation no longer exists.");
  if (donation.source !== "RECORDED") {
    throw new DonationDeleteError("Online donations are confirmed by Paystack and can't be removed here.");
  }
  await db.donation.delete({ where: { id: donation.id } });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "DELETE_DONATION",
      entityType: "Donation",
      entityId: donation.id,
      previousValue: {
        donorName: donation.donorName,
        amountPesewas: donation.amountPesewas,
        fund: donation.fund,
        paidAt: donation.paidAt?.toISOString() ?? null,
      },
    },
  });
}

export async function listDonationsForAdmin(params?: { includePending?: boolean }) {
  return db.donation.findMany({
    where: params?.includePending ? {} : { status: "SUCCESS" },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { name: true } } },
    take: 300,
  });
}

export async function listExpenses() {
  return db.expense.findMany({
    orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { name: true } } },
    take: 500,
  });
}

export async function getExpense(id: string) {
  return db.expense.findUnique({ where: { id } });
}

export async function createExpense(params: {
  category: ExpenseCategory;
  description: string;
  amountPesewas: number;
  spentOn: Date;
  adminId: string;
}) {
  const expense = await db.expense.create({
    data: {
      category: params.category,
      description: params.description,
      amountPesewas: params.amountPesewas,
      spentOn: params.spentOn,
      recordedById: params.adminId,
    },
  });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      newValue: { category: expense.category, description: expense.description, amountPesewas: expense.amountPesewas },
    },
  });
  return expense;
}

export async function updateExpense(params: {
  id: string;
  category: ExpenseCategory;
  description: string;
  amountPesewas: number;
  spentOn: Date;
  adminId: string;
}) {
  const before = await db.expense.findUniqueOrThrow({ where: { id: params.id } });
  const expense = await db.expense.update({
    where: { id: params.id },
    data: {
      category: params.category,
      description: params.description,
      amountPesewas: params.amountPesewas,
      spentOn: params.spentOn,
    },
  });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      previousValue: { category: before.category, description: before.description, amountPesewas: before.amountPesewas },
      newValue: { category: expense.category, description: expense.description, amountPesewas: expense.amountPesewas },
    },
  });
  return expense;
}

export async function deleteExpense(params: { id: string; adminId: string }) {
  const expense = await db.expense.delete({ where: { id: params.id } });
  await db.auditLog.create({
    data: {
      adminId: params.adminId,
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      previousValue: {
        category: expense.category,
        description: expense.description,
        amountPesewas: expense.amountPesewas,
        spentOn: expense.spentOn.toISOString(),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Summaries for the charts
// ---------------------------------------------------------------------------

export interface FinancePeriod {
  key: string;
  label: string;
  dues: number;
  patronDonations: number;
  otherDonations: number;
  expenses: number;
}

type Money = { amountPesewas: number };

async function loadMoney(since: Date | null) {
  const range = since ? { gte: since } : undefined;
  const [dues, donations, expenses] = await Promise.all([
    db.duesPayment.findMany({
      where: { status: "SUCCESS", ...(range ? { paidAt: range } : {}) },
      select: { amountPesewas: true, paidAt: true },
    }),
    db.donation.findMany({
      where: { status: "SUCCESS", ...(range ? { paidAt: range } : {}) },
      select: { amountPesewas: true, paidAt: true, patronId: true, fund: true },
    }),
    db.expense.findMany({
      where: range ? { spentOn: range } : {},
      select: { amountPesewas: true, spentOn: true, category: true },
    }),
  ]);
  return { dues, donations, expenses };
}

const sum = (rows: Money[]) => rows.reduce((total, row) => total + row.amountPesewas, 0);

export interface FinanceTotals {
  raised: number;
  dues: number;
  patronDonations: number;
  otherDonations: number;
  expenses: number;
  balance: number;
}

export async function getFinanceTotals(): Promise<FinanceTotals> {
  const { dues, donations, expenses } = await loadMoney(null);
  const patronDonations = sum(donations.filter((d) => d.patronId));
  const otherDonations = sum(donations.filter((d) => !d.patronId));
  const duesTotal = sum(dues);
  const raised = duesTotal + patronDonations + otherDonations;
  const spent = sum(expenses);
  return { raised, dues: duesTotal, patronDonations, otherDonations, expenses: spent, balance: raised - spent };
}

const monthLabel = new Intl.DateTimeFormat("en-GH", { month: "short", year: "numeric", timeZone: "UTC" });

/** Ghana keeps UTC all year, so UTC months are the association's months. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function emptyPeriod(key: string, label: string): FinancePeriod {
  return { key, label, dues: 0, patronDonations: 0, otherDonations: 0, expenses: 0 };
}

export function bucketFinances(
  periods: FinancePeriod[],
  keyOf: (date: Date) => string,
  data: Awaited<ReturnType<typeof loadMoney>>,
): FinancePeriod[] {
  const byKey = new Map(periods.map((p) => [p.key, p]));
  for (const row of data.dues) {
    const period = row.paidAt && byKey.get(keyOf(row.paidAt));
    if (period) period.dues += row.amountPesewas;
  }
  for (const row of data.donations) {
    const period = row.paidAt && byKey.get(keyOf(row.paidAt));
    if (!period) continue;
    if (row.patronId) period.patronDonations += row.amountPesewas;
    else period.otherDonations += row.amountPesewas;
  }
  for (const row of data.expenses) {
    const period = byKey.get(keyOf(row.spentOn));
    if (period) period.expenses += row.amountPesewas;
  }
  return periods;
}

/** The last `months` calendar months, oldest first, including this one. */
export async function getMonthlyFinances(months = 12, now = new Date()): Promise<FinancePeriod[]> {
  const periods: FinancePeriod[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    periods.push(emptyPeriod(monthKey(d), monthLabel.format(d)));
  }
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return bucketFinances(periods, monthKey, await loadMoney(since));
}

/** The last `years` calendar years, oldest first, including this one. */
export async function getAnnualFinances(years = 5, now = new Date()): Promise<FinancePeriod[]> {
  const periods: FinancePeriod[] = [];
  for (let i = years - 1; i >= 0; i--) {
    const year = String(now.getUTCFullYear() - i);
    periods.push(emptyPeriod(year, year));
  }
  const since = new Date(Date.UTC(now.getUTCFullYear() - (years - 1), 0, 1));
  return bucketFinances(periods, (date) => String(date.getUTCFullYear()), await loadMoney(since));
}

/** Spending by category, largest first, for everything recorded so far. */
export async function getExpenseAllocation(): Promise<{ category: string; label: string; amountPesewas: number }[]> {
  const groups = await db.expense.groupBy({ by: ["category"], _sum: { amountPesewas: true } });
  return EXPENSE_CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    amountPesewas: groups.find((g) => g.category === c.value)?._sum.amountPesewas ?? 0,
  }))
    .filter((row) => row.amountPesewas > 0)
    .sort((a, b) => b.amountPesewas - a.amountPesewas);
}

export async function getDonationTotalsByFund(): Promise<{ fund: string; label: string; amountPesewas: number }[]> {
  const groups = await db.donation.groupBy({
    by: ["fund"],
    where: { status: "SUCCESS" },
    _sum: { amountPesewas: true },
  });
  return DONATION_FUNDS.map((f) => ({
    fund: f.value,
    label: f.label,
    amountPesewas: groups.find((g) => g.fund === f.value)?._sum.amountPesewas ?? 0,
  }));
}

/**
 * Patrons who have given and agreed to be named, in the order they first
 * gave. Names only — never amounts.
 */
export async function getHonorRoll(): Promise<{ patronId: string; name: string; organization: string | null }[]> {
  const donations = await db.donation.findMany({
    where: { status: "SUCCESS", anonymous: false, patronId: { not: null }, patron: { status: "APPROVED" } },
    orderBy: { paidAt: "asc" },
    select: { patronId: true, patron: { select: { title: true, fullName: true, organization: true } } },
  });
  const seen = new Set<string>();
  const roll: { patronId: string; name: string; organization: string | null }[] = [];
  for (const d of donations) {
    if (!d.patronId || !d.patron || seen.has(d.patronId)) continue;
    seen.add(d.patronId);
    roll.push({ patronId: d.patronId, name: patronName(d.patron), organization: d.patron.organization });
  }
  return roll;
}

/** The quarterly balance sheets: published documents in the Financial Reports category. */
export async function listFinancialReports() {
  return db.document.findMany({
    where: {
      status: "PUBLISHED",
      category: { OR: [{ slug: "financial-reports" }, { name: { equals: "Financial Reports", mode: "insensitive" } }] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, description: true, version: true, fileSize: true, mimeType: true, createdAt: true },
  });
}
