"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteLetterAction } from "@/lib/actions/letter-actions";

/** Throwing away a draft. A letter that was paid for cannot be deleted. */
export function DeleteLetterButton({ letterId, title }: { letterId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        startTransition(() => deleteLetterAction(letterId));
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-light disabled:opacity-50"
    >
      {isPending ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : <Trash2 size={14} aria-hidden="true" />}
      {isPending ? "Deleting…" : "Delete this draft"}
    </button>
  );
}
