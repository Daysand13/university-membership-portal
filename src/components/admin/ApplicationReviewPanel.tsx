"use client";

import { useActionState } from "react";
import { Loader2, Check, X, MessageSquareWarning, Eye, Ban } from "lucide-react";
import { reviewApplicationAction } from "@/lib/actions/membership-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FormAlert, FieldError } from "@/components/ui/Common";

export function ApplicationReviewPanel({ applicationId, currentStatus }: { applicationId: string; currentStatus: string }) {
  const [state, formAction, isPending] = useActionState(reviewApplicationAction, initialActionState);
  const isFinal = currentStatus === "APPROVED";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <FormAlert message={state.error} />

      <div>
        <Label htmlFor="adminNote">Admin Note (visible to the applicant for rejections and change requests)</Label>
        <textarea id="adminNote" name="adminNote" rows={3} className={inputClasses} placeholder="Optional context for this decision…" />
        <FieldError messages={state.fieldErrors?.adminNote} />
      </div>

      {isFinal && (
        <p className="text-xs text-slate bg-surface-muted rounded-md px-3 py-2">
          This application has already been approved and a member account has been created. Further status
          changes here will not remove that account — manage it from the Members section instead.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          type="submit"
          name="action"
          value="APPROVE"
          disabled={isPending || isFinal}
          className="flex items-center justify-center gap-1.5 rounded-md bg-success text-white font-semibold text-sm py-2.5 hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={15} /> Approve
        </button>
        <button
          type="submit"
          name="action"
          value="REJECT"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-danger text-white font-semibold text-sm py-2.5 hover:bg-danger/90 disabled:opacity-50"
        >
          <X size={15} /> Reject
        </button>
        <button
          type="submit"
          name="action"
          value="REQUEST_CHANGES"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-md border border-warning text-warning font-semibold text-sm py-2.5 hover:bg-warning-light disabled:opacity-50"
        >
          <MessageSquareWarning size={15} /> Request Changes
        </button>
        <button
          type="submit"
          name="action"
          value="UNDER_REVIEW"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-md border border-primary-800 text-primary-800 font-semibold text-sm py-2.5 hover:bg-primary-50 disabled:opacity-50"
        >
          <Eye size={15} /> Mark Under Review
        </button>
        <button
          type="submit"
          name="action"
          value="SUSPEND"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-md border border-line text-slate font-semibold text-sm py-2.5 hover:bg-surface-muted disabled:opacity-50"
        >
          <Ban size={15} /> Suspend
        </button>
        {isPending && (
          <span className="flex items-center gap-1.5 text-sm text-slate">
            <Loader2 size={15} className="animate-spin" /> Processing…
          </span>
        )}
      </div>
    </form>
  );
}
