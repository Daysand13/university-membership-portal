"use client";

import { useActionState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { reviewBroadcastAction } from "@/lib/actions/patron-admin-actions";
import { initialActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";

export function BroadcastReviewForm({ broadcastId, recipientCount }: { broadcastId: string; recipientCount: number }) {
  const [state, formAction, isPending] = useActionState(reviewBroadcastAction.bind(null, broadcastId), initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const message =
          submitter?.value === "APPROVE"
            ? `Approve and send this now? It goes to ${recipientCount} member${recipientCount === 1 ? "" : "s"} and can't be recalled.`
            : "Decline this broadcast? The patron will be emailed your reason.";
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="space-y-4"
    >
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="review-note">Note to the patron</Label>
        <textarea
          id="review-note"
          name="note"
          rows={3}
          maxLength={1000}
          className={inputClasses}
          placeholder="Required if you decline it; optional if you approve."
        />
        <FieldError messages={fe.note} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="submit"
          name="decision"
          value="APPROVE"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success px-4 py-2.5 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          Approve & Send
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECT"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
        >
          <X size={15} aria-hidden="true" /> Decline
        </button>
      </div>
      {isPending && <p className="text-xs text-slate">Sending can take a little while for a large group — please keep this page open.</p>}
    </form>
  );
}
