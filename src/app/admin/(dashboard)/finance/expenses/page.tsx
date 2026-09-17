import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listExpenses } from "@/lib/services/patron-finance-service";
import { FinanceSectionNav } from "@/components/admin/FinanceSectionNav";
import { ExpenseRowActions } from "@/components/admin/FinanceRowActions";
import { EmptyState } from "@/components/ui/Common";
import { expenseCategoryLabel, formatCedis } from "@/lib/patron-portal-options";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AdminExpensesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { saved } = await searchParams;
  const expenses = await listExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amountPesewas, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display font-bold text-2xl text-primary-950">Finance</h1>
        <Link
          href="/admin/finance/expenses/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900"
        >
          <Plus size={15} aria-hidden="true" /> Record Expense
        </Link>
      </div>
      <p className="text-sm text-slate mb-4">Everything the association spends, grouped by area in the patrons&apos; charts.</p>
      <FinanceSectionNav current="expenses" />

      {saved === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Expense saved.
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState icon={<Receipt size={28} />} title="No expenses yet" description="Record spending so patrons can see where the money goes." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Date</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Description</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Area</th>
                <th scope="col" className="text-right px-5 py-3 font-semibold">Amount</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Recorded by</th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3 whitespace-nowrap text-slate">{dateFormat.format(e.spentOn)}</td>
                  <td className="px-5 py-3 text-primary-950">{e.description}</td>
                  <td className="px-5 py-3 text-slate">{expenseCategoryLabel(e.category)}</td>
                  <td className="px-5 py-3 text-right font-data tabular-nums">{formatCedis(e.amountPesewas)}</td>
                  <td className="px-5 py-3 text-slate">{e.recordedBy?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <ExpenseRowActions id={e.id} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-semibold">
                <td className="px-5 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-5 py-3 text-right font-data tabular-nums">{formatCedis(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
