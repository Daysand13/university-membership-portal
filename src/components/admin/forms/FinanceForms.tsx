"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { recordDonationAction, saveExpenseAction } from "@/lib/actions/patron-admin-actions";
import { initialActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { DONATION_FUNDS, EXPENSE_CATEGORIES } from "@/lib/patron-portal-options";

export interface ExpenseFormValues {
  id: string;
  category: string;
  description: string;
  amountCedis: string;
  spentOn: string;
}

export function ExpenseForm({ expense, today }: { expense?: ExpenseFormValues; today: string }) {
  const [state, formAction, isPending] = useActionState(saveExpenseAction.bind(null, expense?.id ?? null), initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="e-description" required>
          What was it for?
        </Label>
        <input
          id="e-description"
          name="description"
          required
          maxLength={300}
          defaultValue={expense?.description}
          placeholder="e.g. Braille printing for semester exams"
          className={inputClasses}
        />
        <FieldError messages={fe.description} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Label htmlFor="e-category" required>
            Area
          </Label>
          <select id="e-category" name="category" defaultValue={expense?.category ?? "STUDENT_WELFARE"} className={inputClasses}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.category} />
        </div>
        <div>
          <Label htmlFor="e-amount" required>
            Amount (GH₵)
          </Label>
          <input
            id="e-amount"
            name="amount"
            required
            inputMode="decimal"
            defaultValue={expense?.amountCedis}
            className={inputClasses}
          />
          <FieldError messages={fe.amount} />
        </div>
        <div>
          <Label htmlFor="e-date" required>
            Date
          </Label>
          <input
            id="e-date"
            name="spentOn"
            type="date"
            required
            max={today}
            defaultValue={expense?.spentOn ?? today}
            className={inputClasses}
          />
          <FieldError messages={fe.spentOn} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Saving…" : expense ? "Save Changes" : "Record Expense"}
      </Button>
    </form>
  );
}

export function RecordDonationForm({ today }: { today: string }) {
  const [state, formAction, isPending] = useActionState(recordDonationAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="d-name" required>
            From
          </Label>
          <input id="d-name" name="donorName" required maxLength={200} className={inputClasses} placeholder="Person or organisation" />
          <FieldError messages={fe.donorName} />
        </div>
        <div>
          <Label htmlFor="d-email">Email (optional)</Label>
          <input id="d-email" name="donorEmail" type="email" maxLength={254} className={inputClasses} />
          <FieldError messages={fe.donorEmail} />
        </div>
        <div>
          <Label htmlFor="d-amount" required>
            Amount (GH₵)
          </Label>
          <input id="d-amount" name="amount" required inputMode="decimal" className={inputClasses} />
          <FieldError messages={fe.amount} />
        </div>
        <div>
          <Label htmlFor="d-date" required>
            Received on
          </Label>
          <input id="d-date" name="receivedOn" type="date" required max={today} defaultValue={today} className={inputClasses} />
          <FieldError messages={fe.receivedOn} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="d-fund" required>
            Given to
          </Label>
          <select id="d-fund" name="fund" defaultValue="GENERAL" className={inputClasses}>
            {DONATION_FUNDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.fund} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="d-note">Note (optional)</Label>
          <input id="d-note" name="note" maxLength={500} className={inputClasses} placeholder="e.g. Cash at the end-of-year dinner" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="anonymous" className="h-4 w-4 rounded border-line" />
        The donor asked to stay anonymous
      </label>
      <p className="text-xs text-slate">
        Donations recorded here count towards the totals patrons see, as &ldquo;other donations&rdquo;. Online patron
        donations are recorded automatically.
      </p>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Saving…" : "Record Donation"}
      </Button>
    </form>
  );
}
