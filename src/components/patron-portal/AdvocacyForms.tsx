"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, CalendarClock, Loader2, Megaphone } from "lucide-react";
import {
  endorseCampaignAction,
  takeIssueActionAction,
  withdrawEndorsementAction,
} from "@/lib/actions/patron-portal-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ISSUE_ACTIONS } from "@/lib/patron-portal-options";

export function EndorseCampaignForm({
  campaignId,
  endorsed,
  canEndorse,
}: {
  campaignId: string;
  endorsed: boolean;
  canEndorse: boolean;
}) {
  const [state, formAction, isPending] = useActionState(endorseCampaignAction.bind(null, campaignId), initialActionState);
  const fe = state.fieldErrors ?? {};

  if (endorsed) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-success-light border border-success/30 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <BadgeCheck size={18} aria-hidden="true" /> You have officially endorsed this campaign.
        </p>
        {canEndorse && (
          <ConfirmButton
            action={withdrawEndorsementAction.bind(null, campaignId)}
            confirmMessage="Withdraw your endorsement from this campaign?"
            className="sm:ml-auto text-sm font-semibold text-slate hover:text-danger underline"
          >
            Withdraw endorsement
          </ConfirmButton>
        )}
      </div>
    );
  }

  if (!canEndorse) {
    return <p className="text-sm text-slate">This campaign is no longer taking endorsements.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="endorse-comment">A word of support (optional)</Label>
        <textarea
          id="endorse-comment"
          name="comment"
          rows={3}
          maxLength={500}
          className={inputClasses}
          placeholder="Shown with your name on the endorsement sheet the executive presents to management."
        />
        <FieldError messages={fe.comment} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <BadgeCheck size={16} aria-hidden="true" />}
        {isPending ? "Endorsing…" : "Officially Endorse Campaign"}
      </Button>
      <p className="text-xs text-slate">
        Your name, title and organisation are added to the campaign&apos;s endorsement sheet as your seal of support.
      </p>
    </form>
  );
}

export function IssueActionForm({ issueId }: { issueId: string }) {
  const [type, setType] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await takeIssueActionAction(issueId, prev, formData);
    if (result.success) setType(null);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};
  const chosen = ISSUE_ACTIONS.find((a) => a.value === type);

  return (
    <div className="space-y-4">
      {state.success && !type && (
        <FormAlert variant="success" message="Thank you. The executive team has been notified and will follow up." />
      )}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {ISSUE_ACTIONS.map((action) => {
          const Icon = action.value === "MEETING_REQUEST" ? CalendarClock : Megaphone;
          const active = type === action.value;
          return (
            <button
              key={action.value}
              type="button"
              aria-pressed={active}
              onClick={() => setType(active ? null : action.value)}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 min-h-11 text-sm font-semibold border transition-colors ${
                active
                  ? "bg-primary-800 border-primary-800 text-white"
                  : "border-primary-800 text-primary-800 hover:bg-primary-50"
              }`}
            >
              <Icon size={16} aria-hidden="true" /> {action.label}
            </button>
          );
        })}
      </div>

      {chosen && (
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-line bg-surface-muted p-4"
        >
          <FormAlert message={state.error} />
          <input type="hidden" name="type" value={chosen.value} />
          <div>
            <Label htmlFor="issue-action-message" required>
              {chosen.value === "MEETING_REQUEST"
                ? "What should the meeting cover, and when are you available?"
                : "Your statement"}
            </Label>
            <textarea
              id="issue-action-message"
              name="message"
              rows={5}
              required
              maxLength={3000}
              className={inputClasses}
            />
            <FieldError messages={fe.message} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            {isPending ? "Sending…" : chosen.label}
          </Button>
        </form>
      )}
    </div>
  );
}
