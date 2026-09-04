"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { promoteMemberToAlumniAction } from "@/lib/actions/alumni-actions";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Common";

export function MarkGraduatedControl({ memberId, defaultYear }: { memberId: string; defaultYear: number }) {
  const [year, setYear] = useState(defaultYear);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await promoteMemberToAlumniAction(memberId, year);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <GraduationCap size={14} /> Mark as Graduated
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-line p-4 bg-surface-muted max-w-sm">
      <p className="text-sm text-ink mb-3">
        This creates an Alumni Portal account for this member and emails them a link to set their password. This
        cannot be undone from here.
      </p>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-light mb-1">
        Graduation Year
      </label>
      <input
        type="number"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        min={2000}
        max={2100}
        className={`${inputClasses} mb-3`}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={isPending}>
          {isPending && <Loader2 size={13} className="animate-spin" />}
          {isPending ? "Creating…" : "Confirm & Send Invite"}
        </Button>
      </div>
    </div>
  );
}
