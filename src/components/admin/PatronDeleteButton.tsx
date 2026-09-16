"use client";

import { useActionState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deletePatronAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { FormAlert } from "@/components/ui/Common";

/** Permanently deletes a patron application or account, after a confirmation. */
export function PatronDeleteButton({
  patronId,
  name,
  isAccount,
}: {
  patronId: string;
  name: string;
  /** An approved or suspended account rather than an application. */
  isAccount: boolean;
}) {
  const [state, formAction, isPending] = useActionState(deletePatronAction, initialActionState);
  const what = isAccount ? "patron account" : "patron application";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Permanently delete ${name}'s ${what}? This can't be undone.`)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="patronId" value={patronId} />
      <FormAlert message={state.error} />
      <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-line text-primary-800 focus:ring-primary-600"
        />
        Email {name} that their {what} has been removed
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-danger px-3.5 py-2 text-sm font-semibold text-danger hover:bg-danger-light disabled:opacity-50"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete {what}
      </button>
    </form>
  );
}
