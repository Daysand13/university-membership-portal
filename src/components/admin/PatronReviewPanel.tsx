"use client";

import { useActionState } from "react";
import { Ban, Check, Loader2, RotateCcw, X } from "lucide-react";
import { reviewPatronAction } from "@/lib/actions/patron-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert } from "@/components/ui/Common";
import type { PatronDecision } from "@/lib/validations/patron";

const BUTTONS: Record<string, { label: string; icon: typeof Check; className: string; confirm?: string }> = {
  APPROVE: {
    label: "Approve",
    icon: Check,
    className: "bg-success text-white hover:bg-success/90",
  },
  REINSTATE: {
    label: "Reinstate",
    icon: RotateCcw,
    className: "bg-success text-white hover:bg-success/90",
  },
  REJECT: {
    label: "Reject",
    icon: X,
    className: "bg-danger text-white hover:bg-danger/90",
    confirm: "Reject this patron application? They'll be emailed, with your note if you've written one.",
  },
  SUSPEND: {
    label: "Suspend",
    icon: Ban,
    className: "border border-danger text-danger hover:bg-danger-light",
    confirm: "Suspend this patron? They won't be able to sign in until the account is reinstated.",
  },
};

export function PatronReviewPanel({
  patronId,
  status,
  decisions,
}: {
  patronId: string;
  status: string;
  /** What's possible from the current status (see ALLOWED_PATRON_DECISIONS). */
  decisions: PatronDecision[];
}) {
  const [state, formAction, isPending] = useActionState(reviewPatronAction, initialActionState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const key = submitter?.dataset.key;
        const confirmText = key ? BUTTONS[key]?.confirm : undefined;
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="patronId" value={patronId} />
      <FormAlert message={state.error} />
      {state.success && !isPending && (
        <p role="status" className="text-sm font-semibold text-success">
          Saved, and the applicant has been emailed.
        </p>
      )}

      <div>
        <Label htmlFor="patron-note">Note to the applicant (optional)</Label>
        <textarea
          id="patron-note"
          name="note"
          rows={3}
          maxLength={5000}
          className={inputClasses}
          placeholder="Included in the email for a rejection or suspension…"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {decisions.map((decision) => {
          const key = decision === "APPROVE" && status === "SUSPENDED" ? "REINSTATE" : decision;
          const button = BUTTONS[key];
          const Icon = button.icon;
          return (
            <button
              key={decision}
              type="submit"
              name="decision"
              value={decision}
              data-key={key}
              disabled={isPending}
              className={`flex items-center justify-center gap-1.5 rounded-md font-semibold text-sm py-2.5 disabled:opacity-50 ${button.className}`}
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />} {button.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
