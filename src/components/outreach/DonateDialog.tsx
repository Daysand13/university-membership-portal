"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { HandHeart, Loader2, Lock, X } from "lucide-react";
import { startPublicDonationAction } from "@/lib/actions/public-outreach-actions";
import { initialActionState } from "@/lib/actions/types";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
import { DONATION_FUNDS, DONATION_PRESETS_CEDIS, MAX_DONATION_CEDIS, MIN_DONATION_CEDIS } from "@/lib/patron-portal-options";

type ReturnPage = "allies" | "tech-tutorials";

/**
 * Giving without an account, in a dialog over the page the visitor is
 * reading. The dialog collects the gift; Paystack's own secure checkout
 * takes the payment (Mobile Money or card) and sends them back here.
 *
 * Built on the native <dialog> element, which keeps keyboard focus inside
 * it, closes with Escape and is announced as a dialog by screen readers —
 * none of which a hand-rolled overlay gets right by default.
 */
export function DonateDialog({
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "lg",
  triggerClassName = "",
  title,
  intro,
  returnTo,
  fixedFund,
  presetCedis,
  onlineEnabled,
}: {
  triggerLabel: ReactNode;
  /** "outlineOnDark" is a white outline for use on the navy hero. */
  triggerVariant?: "primary" | "secondary" | "outline" | "outlineOnDark";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
  title: string;
  intro?: string;
  returnTo: ReturnPage;
  /** When set, the gift goes to this fund and the choice isn't shown. */
  fixedFund?: string;
  presetCedis?: number;
  onlineEnabled: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction, isPending] = useActionState(startPublicDonationAction, initialActionState);
  const presets = DONATION_PRESETS_CEDIS.map(String);
  const initial = presetCedis ? String(presetCedis) : "100";
  const [choice, setChoice] = useState(presets.includes(initial) ? initial : "custom");
  const [custom, setCustom] = useState(presets.includes(initial) ? "" : initial);
  const amount = choice === "custom" ? custom : choice;
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          triggerVariant === "outlineOnDark"
            ? `inline-flex items-center justify-center gap-2 rounded-md border border-white text-white font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
                triggerSize === "lg" ? "text-base px-6 py-3" : "text-sm px-4 py-2.5"
              } ${triggerClassName}`
            : buttonClasses(triggerVariant, triggerSize, triggerClassName)
        }
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // m-auto: the CSS reset zeroes every margin, which removes the
        // browser's own centring of a modal dialog.
        className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-primary-950/60"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display font-bold text-xl text-primary-950">
              {title}
            </h2>
            {intro && <p className="text-sm text-slate mt-1">{intro}</p>}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="p-2 -mr-2 min-w-11 min-h-11 flex items-center justify-center rounded-md text-slate hover:bg-surface-muted"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {!onlineEnabled ? (
          <div className="px-5 py-5 space-y-3">
            <p className="text-[15px] text-ink">
              Online giving isn&apos;t switched on yet. You can still give today by bank transfer or Mobile Money —
              the details are on the Donate page.
            </p>
            <Link href="/donate" className={buttonClasses("primary", "md")}>
              See how to give
            </Link>
          </div>
        ) : (
          <form action={formAction} className="px-5 py-5 space-y-4">
            <FormAlert message={state.error} />
            <BotProtectionFields />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="amount" value={amount} />
            {fixedFund && <input type="hidden" name="fund" value={fixedFund} />}

            <fieldset>
              <legend className="text-sm font-semibold text-primary-950 mb-2">Amount (GH₵)</legend>
              <div className="grid grid-cols-3 gap-2">
                {[...presets, "custom"].map((value) => (
                  <label
                    key={value}
                    className={`flex items-center justify-center min-h-11 rounded-lg border text-sm font-semibold cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 ${
                      choice === value
                        ? "border-primary-800 bg-primary-800 text-white"
                        : "border-line bg-white text-primary-950 hover:border-primary-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="amountChoice"
                      value={value}
                      checked={choice === value}
                      onChange={() => setChoice(value)}
                      className="sr-only"
                    />
                    {value === "custom" ? "Other" : Number(value).toLocaleString("en-GH")}
                  </label>
                ))}
              </div>
              {choice === "custom" && (
                <div className="mt-3">
                  <Label htmlFor={`${titleId}-amount`}>Your amount in cedis</Label>
                  <input
                    id={`${titleId}-amount`}
                    inputMode="decimal"
                    autoComplete="off"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder={`${MIN_DONATION_CEDIS} – ${MAX_DONATION_CEDIS.toLocaleString("en-GH")}`}
                    className={`${inputClasses} max-w-xs`}
                  />
                </div>
              )}
              <FieldError messages={fe.amount} />
            </fieldset>

            {!fixedFund && (
              <div>
                <Label htmlFor={`${titleId}-fund`}>Give to</Label>
                <select id={`${titleId}-fund`} name="fund" defaultValue="GENERAL" className={inputClasses}>
                  {DONATION_FUNDS.map((fund) => (
                    <option key={fund.value} value={fund.value}>
                      {fund.label}
                    </option>
                  ))}
                </select>
                <FieldError messages={fe.fund} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${titleId}-name`} required>
                  Your name
                </Label>
                <input id={`${titleId}-name`} name="donorName" required autoComplete="name" maxLength={150} className={inputClasses} />
                <FieldError messages={fe.donorName} />
              </div>
              <div>
                <Label htmlFor={`${titleId}-email`} required>
                  Email for your receipt
                </Label>
                <input
                  id={`${titleId}-email`}
                  name="donorEmail"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  className={inputClasses}
                />
                <FieldError messages={fe.donorEmail} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <Button type="submit" disabled={isPending || !amount}>
                {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <HandHeart size={16} aria-hidden="true" />}
                {isPending ? "Opening secure checkout…" : "Continue to payment"}
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-slate">
                <Lock size={13} aria-hidden="true" /> Secure checkout by Paystack: Mobile Money or card.
              </p>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
