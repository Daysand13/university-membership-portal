"use client";

import { useActionState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { initiateDuesPaymentAction } from "@/lib/actions/dues-actions";
import { initialActionState } from "@/lib/actions/types";
import { FormAlert } from "@/components/ui/Common";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/**
 * The member dashboard's "Pay Dues" card. Shown either as a paid receipt
 * (server already knows they've paid this academic year) or a payment
 * prompt with the fee worked out for their specific tier — never both, so
 * there's exactly one thing to look at regardless of status.
 */
export function DuesCard({
  academicYear,
  amountLabel,
  tierLabel,
  paidAt,
  bare = false,
}: {
  academicYear: string;
  amountLabel: string;
  tierLabel: string;
  paidAt: Date | null;
  /** Just the contents, for placing inside a card that already has its own frame and heading. */
  bare?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(initiateDuesPaymentAction, initialActionState);

  return (
    <div className={bare ? "" : "bg-white rounded-lg border border-line p-6"}>
      {!bare && <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Membership Dues</h3>}

      {paidAt ? (
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-success-light text-success flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-950">
              {academicYear} dues paid — {amountLabel}
            </p>
            <p className="text-xs text-slate mt-0.5">
              {tierLabel} · Paid {formatDate(paidAt)}
            </p>
          </div>
        </div>
      ) : (
        <form action={formAction}>
          <FormAlert message={state.error} />
          <p className="text-sm text-ink">
            {academicYear} dues: <span className="font-semibold">{amountLabel}</span>
          </p>
          <p className="text-xs text-slate mt-0.5 mb-4">{tierLabel}</p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 text-white font-semibold px-4 py-2 text-sm hover:bg-primary-900 disabled:opacity-60"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
            {isPending ? "Redirecting to Paystack…" : "Pay with Paystack"}
          </button>
        </form>
      )}
    </div>
  );
}
