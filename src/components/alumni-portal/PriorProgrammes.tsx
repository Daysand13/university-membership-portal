"use client";

import { useActionState, useState, useTransition } from "react";
import { GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import { addPriorProgrammeAction, removePriorProgrammeAction } from "@/lib/actions/alumni-portal-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { DEFAULT_PRIOR_INSTITUTION, PRIOR_QUALIFICATIONS } from "@/lib/outreach-options";

export interface PriorProgrammeItem {
  id: string;
  qualification: string;
  programme: string;
  institution: string;
  yearCompleted: number | null;
}

function RemoveButton({ id, programme }: { id: string; programme: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove ${programme} from your record?`)) return;
        startTransition(async () => {
          await removePriorProgrammeAction(id);
        });
      }}
      aria-label={`Remove ${programme}`}
      className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-md text-slate hover:text-danger hover:bg-danger-light shrink-0 disabled:opacity-50"
    >
      {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Trash2 size={16} aria-hidden="true" />}
    </button>
  );
}

/**
 * The undergraduate programmes a postgraduate alumnus did before — listed,
 * with a short form to add another. The form starts closed once there's
 * something on the list, so the card reads as a record first and a form
 * second.
 */
export function PriorProgrammes({
  programmes,
  setsGraduation = false,
}: {
  programmes: PriorProgrammeItem[];
  /** The latest one is shown as the programme they graduated in, on their alumni profile. */
  setsGraduation?: boolean;
}) {
  const [open, setOpen] = useState(programmes.length === 0);
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addPriorProgrammeAction(prev, formData);
    if (result.success) {
      setResetKey((k) => k + 1);
      setOpen(false);
    }
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      {programmes.length > 0 && (
        <ul className="divide-y divide-line">
          {programmes.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0">
              <GraduationCap size={18} aria-hidden="true" className="text-primary-800 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary-950 break-words">{p.programme}</p>
                <p className="text-sm text-slate">
                  {p.qualification} · {p.institution}
                  {p.yearCompleted && <> · completed {p.yearCompleted}</>}
                </p>
              </div>
              <RemoveButton id={p.id} programme={p.programme} />
            </li>
          ))}
        </ul>
      )}

      {state.success && !open && (
        <p role="status" className="text-sm font-semibold text-success">
          Added to your record.
        </p>
      )}

      {open ? (
        <form action={formAction} className="space-y-4 rounded-lg border border-line p-4" key={resetKey}>
          <FormAlert message={state.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prior-qualification" required>
                Qualification
              </Label>
              <select id="prior-qualification" name="qualification" defaultValue={PRIOR_QUALIFICATIONS[0]} className={inputClasses}>
                {PRIOR_QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <FieldError messages={fe.qualification} />
            </div>
            <div>
              <Label htmlFor="prior-year">Year completed</Label>
              <input
                id="prior-year"
                name="yearCompleted"
                inputMode="numeric"
                maxLength={4}
                className={`${inputClasses} max-w-[8rem]`}
                placeholder="e.g. 2019"
              />
              <FieldError messages={fe.yearCompleted} />
            </div>
          </div>
          <div>
            <Label htmlFor="prior-programme" required>
              Programme
            </Label>
            <input
              id="prior-programme"
              name="programme"
              required
              maxLength={200}
              className={inputClasses}
              placeholder="e.g. B.Ed. Special Education"
            />
            <FieldError messages={fe.programme} />
          </div>
          <div>
            <Label htmlFor="prior-institution" required>
              University or college
            </Label>
            <input
              id="prior-institution"
              name="institution"
              required
              maxLength={200}
              defaultValue={DEFAULT_PRIOR_INSTITUTION}
              className={inputClasses}
            />
            <FieldError messages={fe.institution} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Plus size={16} aria-hidden="true" />}
              {isPending ? "Adding…" : "Add programme"}
            </Button>
            {programmes.length > 0 && (
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-slate hover:text-primary-800">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 min-h-11 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
        >
          <Plus size={15} aria-hidden="true" /> Add another undergraduate programme
        </button>
      )}

      <p className="text-xs text-slate">
        Added by you — shown as your own account of your education, not as an association record.
        {setsGraduation &&
          " The most recent one is also shown as the programme you graduated in, with its year as your class, on your alumni profile."}
      </p>
    </div>
  );
}
