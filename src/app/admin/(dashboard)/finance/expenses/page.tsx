import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listExpenses } from "@/lib/services/patron-finance-service";
import { FinanceSectionNav } from "@/components/admin/FinanceSectionNav";
import { ExpenseRowActions } from "@/components/admin/FinanceRowActions";
import { EmptyState } from "@/components/ui/Common";
import { expenseCategoryLabel, formatCedis } from "@/lib/patron-portal-options";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AdminExpensesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireCapability("finance.ledger");
  const { saved } = await searchParams;
  const expenses = await listExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amountPesewas, 0);

  const columns: Column<(typeof expenses)[number]>[] = [
    { header: "Date", cell: (e) => dateFormat.format(e.spentOn) },
    { header: "Description", cell: (e) => <span className="text-primary-950">{e.description}</span> },
    { header: "Area", cell: (e) => expenseCategoryLabel(e.category) },
    {
      header: "Amount",
      align: "right",
      cell: (e) => <span className="font-data tabular-nums">{formatCedis(e.amountPesewas)}</span>,
    },
    { header: "Recorded by", cell: (e) => e.recordedBy?.name ?? "—" },
    { header: "Actions", actions: true, cell: (e) => <ExpenseRowActions id={e.id} /> },
  ];

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
        <DataTable
          caption="Expenses"
          rows={expenses}
          rowKey={(e) => e.id}
          columns={columns}
          total={{ label: "Total", value: formatCedis(total) }}
        />
      )}
    </div>
  );
}
