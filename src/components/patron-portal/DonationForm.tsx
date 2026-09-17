"use client";

import { useActionState, useState } from "react";
import { HandHeart, Loader2, Lock } from "lucide-react";
import { startDonationAction } from "@/lib/actions/patron-portal-actions";
import { initialActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import {
  DONATION_FUNDS,
  DONATION_PRESETS_CEDIS,
  MAX_DONATION_CEDIS,
  MIN_DONATION_CEDIS,
} from "@/lib/patron-portal-options";

/**
 * The Give Back card: a preset or custom amount, the cause, and whether the
 * patron's name may appear on the Honor Roll. Submitting sends the patron to
 * Paystack's checkout (Mobile Money or card) and back to the Finances page.
 */
export function DonationForm({ onlineGivingEnabled }: { onlineGivingEnabled: boolean }) {
  const [state, formAction, isPending] = useActionState(startDonationAction, initialActionState);
  const [preset, setPreset] = useState<string>("100");
  const [custom, setCustom] = useState("");
  const fe = state.fieldErrors ?? {};
  const amount = preset === "custom" ? custom : preset;

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <input type="hidden" name="amount" value={amount} />

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Amount (GH₵)</legend>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[...DONATION_PRESETS_CEDIS.map(String), "custom"].map((value) => (
            <label
              key={value}
              className={`flex items-center justify-center min-h-11 rounded-lg border text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 ${
                preset === value
                  ? "border-primary-800 bg-primary-800 text-white"
                  : "border-line bg-white text-primary-950 hover:border-primary-400"
              }`}
            >
              <input
                type="radio"
                name="amountChoice"
                value={value}
                checked={preset === value}
                onChange={() => setPreset(value)}
                className="sr-only"
              />
              {value === "custom" ? "Other" : Number(value).toLocaleString("en-GH")}
            </label>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-3">
            <label htmlFor="custom-amount" className="block text-sm font-medium text-primary-950 mb-1.5">
              Your amount in cedis
            </label>
            <input
              id="custom-amount"
              inputMode="decimal"
              autoComplete="off"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={`${MIN_DONATION_CEDIS} – ${MAX_DONATION_CEDIS.toLocaleString("en-GH")}`}
              className={`${inputClasses} max-w-xs`}
              aria-describedby="custom-amount-error"
            />
          </div>
        )}
        <div id="custom-amount-error">
          <FieldError messages={fe.amount} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Give to</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DONATION_FUNDS.map((fund, i) => (
            <label
              key={fund.value}
              className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                name="fund"
                value={fund.value}
                defaultChecked={i === 0}
                className="mt-1 h-4 w-4 text-primary-800"
              />
              <span>
                <span className="block text-sm font-semibold text-primary-950">{fund.label}</span>
                <span className="block text-xs text-slate mt-0.5">{fund.description}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.fund} />
      </fieldset>

      <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-3 cursor-pointer">
        <input type="checkbox" name="anonymous" className="mt-1 h-4 w-4 rounded border-line text-primary-800" />
        <span>
          <span className="block text-sm font-semibold text-primary-950">Give anonymously</span>
          <span className="block text-xs text-slate mt-0.5">
            Leave this unticked to have your name (never the amount) shown on the Patron Honor Roll.
          </span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending || !onlineGivingEnabled || !amount}>
          {isPending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <HandHeart size={17} aria-hidden="true" />}
          {isPending ? "Opening secure checkout…" : "Give Now"}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-slate">
          <Lock size={13} aria-hidden="true" /> Secure payment by Paystack: Mobile Money or card.
        </p>
      </div>
    </form>
  );
}
