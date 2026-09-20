import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getExpense } from "@/lib/services/patron-finance-service";
import { ExpenseForm } from "@/components/admin/forms/FinanceForms";

export const metadata = { title: "Edit Expense" };
export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("finance.ledger");
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/finance/expenses" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Expenses
      </Link>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Expense</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <ExpenseForm
          today={new Date().toISOString().slice(0, 10)}
          expense={{
            id: expense.id,
            category: expense.category,
            description: expense.description,
            amountCedis: (expense.amountPesewas / 100).toFixed(2),
            spentOn: expense.spentOn.toISOString().slice(0, 10),
          }}
        />
      </div>
    </div>
  );
}
