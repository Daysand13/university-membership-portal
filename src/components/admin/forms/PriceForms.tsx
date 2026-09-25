"use client";

import { useActionState } from "react";
import { Coins, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { setDuesRatesAction, setNominationFeeAction } from "@/lib/actions/ballot-actions";
import { initialActionState } from "@/lib/actions/types";

/**
 * What the association charges.
 *
 * Both of these were numbers in the source until now, which meant a
 * decision the executive takes at a meeting needed a developer and a
 * deployment. Every figure is in whole cedis on screen and pesewas
 * underneath, and nothing already paid is ever re-priced.
 */

function CedisField({
  id,
  name,
  label,
  hint,
  defaultPesewas,
  errors,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultPesewas: number;
  errors?: string[];
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate">
          GH₵
        </span>
        <input
          id={id}
          name={name}
          type="number"
          min={0}
          max={1000}
          step="0.5"
          defaultValue={(defaultPesewas / 100).toFixed(2)}
          className={`${inputClasses} pl-12`}
        />
      </div>
      {hint && <p className="text-xs text-slate mt-1">{hint}</p>}
      <FieldError messages={errors} />
    </div>
  );
}

export function DuesRatesForm({
  rates,
}: {
  rates: { fresherOrPgFirstYear: number; continuing: number; executive: number };
}) {
  const [state, formAction, isPending] = useActionState(setDuesRatesAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CedisField
          id="rate-fresher"
          name="fresherOrPgFirstYear"
          label="Freshers"
          hint="Level 100, and postgraduates in their first year."
          defaultPesewas={rates.fresherOrPgFirstYear}
          errors={fe.fresherOrPgFirstYear}
        />
        <CedisField
          id="rate-continuing"
          name="continuing"
          label="Continuing students"
          defaultPesewas={rates.continuing}
          errors={fe.continuing}
        />
        <CedisField
          id="rate-executive"
          name="executive"
          label="Executives"
          hint="Anyone linked to an active Leadership listing."
          defaultPesewas={rates.executive}
          errors={fe.executive}
        />
      </div>
      <p className="text-xs text-slate">
        Changing these only affects dues not yet paid. Every payment keeps the figure and the tier it was charged at.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Coins size={16} aria-hidden="true" />
          )}
          {isPending ? "Saving…" : "Save the rates"}
        </Button>
        <SavedNotice state={state} isPending={isPending} />
      </div>
    </form>
  );
}

export function NominationFeeForm({
  positionId,
  electionId,
  title,
  feePesewas,
}: {
  positionId: string;
  electionId: string;
  title: string;
  feePesewas: number;
}) {
  const [state, formAction, isPending] = useActionState(
    setNominationFeeAction.bind(null, positionId, electionId),
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <CedisField
          id={`fee-${positionId}`}
          name="nominationFee"
          label={`${title} form`}
          defaultPesewas={feePesewas}
          errors={state.fieldErrors?.nominationFeePesewas}
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <Loader2 size={15} aria-hidden="true" className="animate-spin" />
        ) : (
          <Save size={15} aria-hidden="true" />
        )}
        {isPending ? "Saving…" : "Save"}
      </Button>
      <SavedNotice state={state} isPending={isPending} />
    </form>
  );
}
