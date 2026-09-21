"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveCampaignAction, saveIssueAction } from "@/lib/actions/patron-admin-actions";
import { initialActionState } from "@/lib/actions/types";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { SuccessDialog, useResettableForm } from "@/components/ui/SuccessDialog";
import { Button } from "@/components/ui/Button";
import { CAMPAIGN_STATUSES, ISSUE_CATEGORIES, ISSUE_STAGES } from "@/lib/patron-portal-options";

export interface CampaignFormValues {
  id: string;
  title: string;
  summary: string;
  details: string | null;
  initiatedBy: string | null;
  targetBody: string | null;
  status: string;
}

export function CampaignForm({ campaign }: { campaign?: CampaignFormValues }) {
  const [state, formAction, isPending] = useActionState(saveCampaignAction.bind(null, campaign?.id ?? null), initialActionState);
  const fe = state.fieldErrors ?? {};

  const { formKey, formRef, resetForm } = useResettableForm();

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="space-y-5">
        <FormAlert message={state.error} />
        {campaign && state.success && (
          <FormAlert variant="success" message="Saved. Patrons see the changes straight away." />
        )}
        <div>
          <Label htmlFor="c-title" required>
            Title
          </Label>
          <input id="c-title" name="title" required maxLength={200} defaultValue={campaign?.title} className={inputClasses} />
          <FieldError messages={fe.title} />
        </div>
        <div>
          <Label htmlFor="c-summary" required>
            Summary
          </Label>
          <textarea id="c-summary" name="summary" rows={3} required maxLength={600} defaultValue={campaign?.summary} className={inputClasses} />
          <FieldError messages={fe.summary} />
        </div>
        <div>
          <Label htmlFor="c-details">Full details</Label>
          <textarea id="c-details" name="details" rows={8} maxLength={10000} defaultValue={campaign?.details ?? ""} className={inputClasses} />
          <FieldError messages={fe.details} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label htmlFor="c-initiated">Started by</Label>
            <input
              id="c-initiated"
              name="initiatedBy"
              maxLength={200}
              defaultValue={campaign?.initiatedBy ?? ""}
              placeholder="e.g. Students' Executive"
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor="c-target">Addressed to</Label>
            <input
              id="c-target"
              name="targetBody"
              maxLength={200}
              defaultValue={campaign?.targetBody ?? ""}
              placeholder="e.g. University Management"
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor="c-status">Status</Label>
            <select id="c-status" name="status" defaultValue={campaign?.status ?? "ACTIVE"} className={inputClasses}>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate mt-1">Only active campaigns take endorsements.</p>
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Saving…" : campaign ? "Save Changes" : "Create Campaign"}
        </Button>
      </form>

      {!campaign && (
        <SuccessDialog
          state={state}
          isPending={isPending}
          title="Campaign created"
          againLabel="Start another"
          onAgain={resetForm}
          listHref="/admin/patrons/advocacy"
          listLabel="Back to advocacy"
        />
      )}
    </>
  );
}

export interface IssueFormValues {
  id: string;
  title: string;
  summary: string;
  category: string;
  location: string | null;
  status: string;
  reportedOn: string;
  resolutionNote: string | null;
}

export function IssueForm({ issue, today }: { issue?: IssueFormValues; today: string }) {
  const [state, formAction, isPending] = useActionState(saveIssueAction.bind(null, issue?.id ?? null), initialActionState);
  const fe = state.fieldErrors ?? {};

  const { formKey, formRef, resetForm } = useResettableForm();

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="space-y-5">
        <FormAlert message={state.error} />
        {issue && state.success && (
          <FormAlert variant="success" message="Saved. Patrons see the changes straight away." />
        )}
        <div className="rounded-md bg-warning-light border border-warning/30 px-4 py-3 text-sm text-ink">
          Patrons see everything written here. Describe the problem, not the people: never include a student&apos;s name,
          index number or health details.
        </div>
        <div>
          <Label htmlFor="i-title" required>
            Title
          </Label>
          <input id="i-title" name="title" required maxLength={200} defaultValue={issue?.title} className={inputClasses} />
          <FieldError messages={fe.title} />
        </div>
        <div>
          <Label htmlFor="i-summary" required>
            Summary
          </Label>
          <textarea id="i-summary" name="summary" rows={6} required maxLength={3000} defaultValue={issue?.summary} className={inputClasses} />
          <FieldError messages={fe.summary} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="i-category" required>
              Category
            </Label>
            <select id="i-category" name="category" defaultValue={issue?.category ?? "PHYSICAL_ACCESS"} className={inputClasses}>
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError messages={fe.category} />
          </div>
          <div>
            <Label htmlFor="i-location">Location</Label>
            <input
              id="i-location"
              name="location"
              maxLength={200}
              defaultValue={issue?.location ?? ""}
              placeholder="e.g. North Campus lecture halls"
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor="i-status" required>
              Stage
            </Label>
            <select id="i-status" name="status" defaultValue={issue?.status ?? "SUBMITTED"} className={inputClasses}>
              {ISSUE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="i-reported" required>
              Reported on
            </Label>
            <input
              id="i-reported"
              name="reportedOn"
              type="date"
              required
              max={today}
              defaultValue={issue?.reportedOn ?? today}
              className={inputClasses}
            />
            <FieldError messages={fe.reportedOn} />
          </div>
        </div>
        <div>
          <Label htmlFor="i-resolution">How it was resolved</Label>
          <textarea
            id="i-resolution"
            name="resolutionNote"
            rows={3}
            maxLength={2000}
            defaultValue={issue?.resolutionNote ?? ""}
            placeholder="Shown to patrons once the stage is Resolved."
            className={inputClasses}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Saving…" : issue ? "Save Changes" : "Escalate to Patrons"}
        </Button>
      </form>

      {!issue && (
        <SuccessDialog
          state={state}
          isPending={isPending}
          title="Issue escalated"
          againLabel="Escalate another"
          onAgain={resetForm}
          listHref="/admin/patrons/advocacy"
          listLabel="Back to advocacy"
        />
      )}
    </>
  );
}
