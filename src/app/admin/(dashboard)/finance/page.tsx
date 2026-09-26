import Link from "next/link";
import { FileText, HandHeart, Receipt, Scale, Wallet } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { isPaystackConfigured } from "@/lib/services/paystack-client";
import { getExpenseAllocation, getFinanceTotals, getMonthlyFinances } from "@/lib/services/patron-finance-service";
import { FinanceSectionNav } from "@/components/admin/FinanceSectionNav";
import { StatCard } from "@/components/admin/StatCard";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { BarList } from "@/components/charts/BarList";
import { formatCedis } from "@/lib/patron-portal-options";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  await requireCapability("finance.ledger");
  const [totals, months, allocation] = await Promise.all([getFinanceTotals(), getMonthlyFinances(12), getExpenseAllocation()]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Finance</h1>
      <p className="text-sm text-slate mb-4 max-w-3xl">
        What patrons see on the Finances page of their portal: money raised from dues, donations and the documents
        the association prepares, beside the spending you record here.
      </p>
      <FinanceSectionNav current="overview" />

      {!isPaystackConfigured() && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-sm text-ink">
          <strong>Online payments are switched off</strong>: PAYSTACK_SECRET_KEY isn&apos;t set for this site, so patrons
          can&apos;t give online (and members can&apos;t pay dues online). Add the key in the Vercel project settings to
          switch them on, and point the Paystack webhook at <code className="font-data">/api/webhooks/paystack</code>.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Wallet} label="Total Raised" value={formatCedis(totals.raised)} />
        <StatCard icon={HandHeart} label="Donations" value={formatCedis(totals.patronDonations + totals.otherDonations)} href="/admin/finance/donations" />
        <StatCard icon={FileText} label="Documents" value={formatCedis(totals.documents)} href="/admin/finance/documents" />
        <StatCard icon={Receipt} label="Expenses" value={formatCedis(totals.expenses)} href="/admin/finance/expenses" />
        <StatCard icon={Scale} label="Balance" value={formatCedis(totals.balance)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-1">Last twelve months</h2>
          <p className="text-sm text-slate mb-4">Money received by source, beside money spent.</p>
          <ColumnChart
            label="Money raised by source and expenses per month"
            categories={months.map((m) => m.label)}
            bars={[
              {
                key: "raised",
                label: "Raised",
                series: [
                  { key: "dues", label: "Dues", color: "var(--viz-dues)" },
                  { key: "donations", label: "Donations", color: "var(--viz-patron)" },
                  { key: "documents", label: "Documents", color: "var(--viz-documents)" },
                ],
              },
              { key: "spent", label: "Expenses", series: [{ key: "expenses", label: "Expenses", color: "var(--viz-expense)" }] },
            ]}
            values={{
              dues: months.map((m) => m.dues),
              donations: months.map((m) => m.patronDonations + m.otherDonations),
              documents: months.map((m) => m.documents),
              expenses: months.map((m) => m.expenses),
            }}
            formatValue={(n) => formatCedis(n)}
            formatTick={(n) => formatCedis(n, { compact: true })}
            minWidth={560}
          />
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-4">Spending by area</h2>
            {allocation.length === 0 ? (
              <p className="text-sm text-slate">
                Nothing recorded yet.{" "}
                <Link href="/admin/finance/expenses/new" className="font-semibold text-primary-800 hover:text-accent-600">
                  Record an expense
                </Link>
              </p>
            ) : (
              <BarList
                label="Spending by area"
                rows={allocation.map((a) => ({ key: a.category, label: a.label, value: a.amountPesewas }))}
                color="var(--viz-expense)"
                formatValue={(n) => formatCedis(n)}
              />
            )}
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-2">
              <FileText size={18} aria-hidden="true" /> Quarterly balance sheets
            </h2>
            <p className="text-sm text-slate">
              Upload them in the{" "}
              <Link href="/admin/library/new" className="font-semibold text-primary-800 hover:text-accent-600">
                Library
              </Link>{" "}
              under the <strong>Financial Reports</strong> category and publish them. Choose &ldquo;Patrons only&rdquo; to
              keep them off the public library; they appear in the Contribution Ledger on the patrons&apos; Finances page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
