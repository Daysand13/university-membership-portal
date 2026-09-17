"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExpenseAction, deleteRecordedDonationAction } from "@/lib/actions/patron-admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function ExpenseRowActions({ id }: { id: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/finance/expenses/${id}`} title="Edit" className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
        <Pencil size={15} aria-hidden="true" />
        <span className="sr-only">Edit</span>
      </Link>
      <ConfirmButton
        action={() => deleteExpenseAction(id)}
        confirmMessage="Delete this expense? The finance charts will no longer include it."
        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
      >
        <Trash2 size={15} aria-hidden="true" />
        <span className="sr-only">Delete</span>
      </ConfirmButton>
    </div>
  );
}

export function RecordedDonationDeleteButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      action={() => deleteRecordedDonationAction(id)}
      confirmMessage="Remove this recorded donation? The totals patrons see will change."
      className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
    >
      <Trash2 size={15} aria-hidden="true" />
      <span className="sr-only">Remove</span>
    </ConfirmButton>
  );
}
