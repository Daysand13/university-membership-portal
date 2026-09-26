"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Send, Siren, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { SuccessDialog, useResettableForm } from "@/components/ui/SuccessDialog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PatronFileField } from "@/components/patron-portal/PatronFileField";
import { BROADCAST_AUDIENCES, ISSUE_CATEGORIES, formatCedis } from "@/lib/patron-portal-options";
import { BARRIER_STAGES, SUPPORT_EXPENSE_CATEGORY, supportRequestTypeLabel } from "@/lib/portal-options";
import {
  escalateReportAction,
  recordSupportPayoutAction,
  reviewOpportunityAction,
  reviewSupportRequestAction,
  sendBroadcastAction,
  updateBarrierReportAction,
} from "@/lib/actions/executive-actions";
import { expenseCategoryLabel } from "@/lib/patron-portal-options";
import { initialActionState, type ActionState } from "@/lib/actions/types";

/**
 * The executive desks' forms: triaging a student's barrier report,
 * escalating one to the patrons, deciding on a support request, recording a
 * payout, moderating the opportunity board, and writing a broadcast.
 */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// The escalation desk
// ---------------------------------------------------------------------------

export function BarrierTriageForm({
  reportId,
  currentStatus,
  assignedToId,
  admins,
}: {
  reportId: string;
  currentStatus: string;
  assignedToId: string | null;
  admins: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateBarrierReportAction.bind(null, reportId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="triage-status" required>
            Move it to
          </Label>
          <select id="triage-status" name="status" defaultValue={currentStatus} className={inputClasses}>
            {BARRIER_STAGES.filter((s) => s.value !== "ESCALATED").map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
            <option value="ESCALATED" disabled>
              Escalated to Patrons — use Escalate below
            </option>
            <option value="CLOSED">Closed without resolving</option>
          </select>
          <FieldError messages={fe.status} />
        </div>
        <div>
          <Label htmlFor="triage-assignee">Handled by</Label>
          <select id="triage-assignee" name="assignedToId" defaultValue={assignedToId ?? ""} className={inputClasses}>
            <option value="">Nobody yet</option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
          <FieldError messages={fe.assignedToId} />
        </div>
      </div>

      <div>
        <Label htmlFor="triage-note" required>
          Note for the student
        </Label>
        <p className="text-xs text-slate mb-1.5">
          The student reads this word for word on their tracker, and gets it by email. Say what you&apos;ve done, not
          just that you&apos;ve done something.
        </p>
        <textarea id="triage-note" name="note" rows={4} required maxLength={3000} className={inputClasses} />
        <FieldError messages={fe.note} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {isPending ? "Saving…" : "Save & notify the student"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Saved. The student has been told.
        </SavedNotice>
      </div>
    </form>
  );
}

export function EscalateReportForm({
  reportId,
  suggestedTitle,
  suggestedSummary,
  category,
  location,
}: {
  reportId: string;
  suggestedTitle: string;
  suggestedSummary: string;
  category: string;
  location: string | null;
}) {
  const [state, formAction, isPending] = useActionState(escalateReportAction.bind(null, reportId), initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Escalate this to the patrons? They'll see the summary below — never the student's name.")) {
          e.preventDefault();
        }
      }}
      className="space-y-4"
    >
      <FormAlert message={state.error} />
      <p className="rounded-lg bg-accent-50 border border-accent-400 px-3.5 py-3 text-sm text-primary-950">
        What you write here is what the patrons see. Keep it about the barrier, not the student: no name, no index
        number, nothing about anyone&apos;s condition or support needs.
      </p>

      <div>
        <Label htmlFor="escalate-title" required>
          Title
        </Label>
        <input
          id="escalate-title"
          name="title"
          required
          maxLength={200}
          defaultValue={suggestedTitle}
          className={inputClasses}
        />
        <FieldError messages={fe.title} />
      </div>

      <div>
        <Label htmlFor="escalate-summary" required>
          Summary for the patrons
        </Label>
        <textarea
          id="escalate-summary"
          name="summary"
          rows={5}
          required
          maxLength={3000}
          defaultValue={suggestedSummary}
          className={inputClasses}
        />
        <FieldError messages={fe.summary} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="escalate-category" required>
            Category
          </Label>
          <select id="escalate-category" name="category" defaultValue={category} className={inputClasses}>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.category} />
        </div>
        <div>
          <Label htmlFor="escalate-location">Where</Label>
          <input
            id="escalate-location"
            name="location"
            maxLength={200}
            defaultValue={location ?? ""}
            className={inputClasses}
          />
          <FieldError messages={fe.location} />
        </div>
      </div>

      <Button type="submit" disabled={isPending} variant="secondary">
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Siren size={16} aria-hidden="true" />}
        {isPending ? "Escalating…" : "Escalate to the patrons"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Support requests
// ---------------------------------------------------------------------------

export function SupportReviewForm({
  requestId,
  requestedPesewas,
  studentFirstName,
}: {
  requestId: string;
  requestedPesewas: number | null;
  studentFirstName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    reviewSupportRequestAction.bind(null, requestId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const message =
          submitter?.value === "APPROVE"
            ? `Approve this request? ${studentFirstName} will be emailed.`
            : `Decline this request? ${studentFirstName} will be emailed your note.`;
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="space-y-4"
    >
      <FormAlert message={state.error} />

      {requestedPesewas !== null && (
        <div>
          <Label htmlFor="approved-amount">Amount approved (GH₵)</Label>
          <input
            id="approved-amount"
            name="approvedAmount"
            inputMode="decimal"
            defaultValue={(requestedPesewas / 100).toString()}
            className={`${inputClasses} max-w-[10rem]`}
          />
          <p className="text-xs text-slate mt-1">{formatCedis(requestedPesewas)} was asked for.</p>
          <FieldError messages={fe.approvedAmount} />
        </div>
      )}

      <div>
        <Label htmlFor="support-note">Note to the student</Label>
        <textarea
          id="support-note"
          name="note"
          rows={3}
          maxLength={2000}
          className={inputClasses}
          placeholder="Required if you decline; optional if you approve."
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
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="DECLINE"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
        >
          <X size={15} aria-hidden="true" /> Decline
        </button>
      </div>
      <FieldError messages={fe.decision} />
    </form>
  );
}

export function SupportPayoutForm({
  requestId,
  type,
  approvedPesewas,
  studentName,
}: {
  requestId: string;
  type: string;
  approvedPesewas: number | null;
  studentName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    recordSupportPayoutAction.bind(null, requestId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <p className="text-sm text-slate">
        Recording this writes it into the finance ledger as{" "}
        <span className="font-semibold text-primary-950">
          {expenseCategoryLabel(SUPPORT_EXPENSE_CATEGORY[type as keyof typeof SUPPORT_EXPENSE_CATEGORY])}
        </span>{" "}
        spending and tells {studentName.split(" ")[0]} it&apos;s been provided.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="payout-amount" required>
            Amount paid out (GH₵)
          </Label>
          <input
            id="payout-amount"
            name="amount"
            inputMode="decimal"
            required
            defaultValue={approvedPesewas ? (approvedPesewas / 100).toString() : ""}
            className={inputClasses}
          />
          <FieldError messages={fe.amount} />
        </div>
        <div>
          <Label htmlFor="payout-date" required>
            Date
          </Label>
          <input id="payout-date" name="spentOn" type="date" required defaultValue={today()} className={inputClasses} />
          <FieldError messages={fe.spentOn} />
        </div>
      </div>

      <div>
        <Label htmlFor="payout-description" required>
          What it was for
        </Label>
        <input
          id="payout-description"
          name="description"
          required
          maxLength={300}
          defaultValue={`${supportRequestTypeLabel(type)} for a student`}
          className={inputClasses}
        />
        <FieldError messages={fe.description} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {isPending ? "Recording…" : "Record the payout"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Recorded, and in the ledger.
        </SavedNotice>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// The opportunity board
// ---------------------------------------------------------------------------

export function OpportunityReviewForm({ opportunityId }: { opportunityId: string }) {
  const [state, formAction, isPending] = useActionState(
    reviewOpportunityAction.bind(null, opportunityId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const message =
          submitter?.value === "APPROVE"
            ? "Publish this posting to students and alumni?"
            : "Decline this posting? The alumnus will be emailed your reason.";
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="space-y-4"
    >
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="opportunity-note">Note to the alumnus</Label>
        <textarea
          id="opportunity-note"
          name="note"
          rows={3}
          maxLength={1000}
          className={inputClasses}
          placeholder="Required if you decline it; optional if you publish it."
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
          Publish
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
      <FieldError messages={fe.decision} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// The executives' own broadcast
// ---------------------------------------------------------------------------

export function AdminBroadcastComposer({
  defaultAuthorName,
  recipientCounts,
}: {
  defaultAuthorName: string;
  recipientCounts: Record<string, number>;
}) {
  const [audience, setAudience] = useState<string>("ALL_MEMBERS");
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => sendBroadcastAction(prev, formData),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};
  const count = recipientCounts[audience] ?? 0;

  const { formKey, formRef, resetForm } = useResettableForm();

  return (
    <>
      <form
        ref={formRef}
        key={formKey}
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`Send this now to ${count} recipient${count === 1 ? "" : "s"}? It can't be recalled.`)) {
            e.preventDefault();
          }
        }}
        className="space-y-5"
      >
        <FormAlert message={state.error} />

        <fieldset>
          <legend className="text-sm font-semibold text-primary-950 mb-2">Send to</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BROADCAST_AUDIENCES.map((option) => (
              <label
                key={option.value}
                // Explicit id and htmlFor rather than relying on the label
                // wrapping the input: see components/portal/SignaturePad for
                // what a member actually heard when we relied on that.
                htmlFor={`broadcast-audience-${option.value}`}
                className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
              >
                <input
                  id={`broadcast-audience-${option.value}`}
                  type="radio"
                  name="audience"
                  value={option.value}
                  aria-label={option.label}
                  checked={audience === option.value}
                  onChange={() => setAudience(option.value)}
                  className="mt-1 h-4 w-4 text-primary-800"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary-950">
                    <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.dot }} />
                    {option.label}
                  </span>
                  <span className="block text-xs text-slate mt-0.5">
                    {recipientCounts[option.value] ?? 0} recipient{(recipientCounts[option.value] ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError messages={fe.audience} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="broadcast-author" required>
              From
            </Label>
            <input
              id="broadcast-author"
              name="authorName"
              required
              maxLength={120}
              defaultValue={defaultAuthorName}
              className={inputClasses}
            />
            <p className="text-xs text-slate mt-1">How members see the sender, e.g. &ldquo;The President&rdquo;.</p>
            <FieldError messages={fe.authorName} />
          </div>
          <div>
            <Label htmlFor="broadcast-subject" required>
              Subject
            </Label>
            <input id="broadcast-subject" name="subject" required maxLength={150} className={inputClasses} />
            <FieldError messages={fe.subject} />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-primary-950 mb-2">How to send it</legend>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
            <label
              htmlFor="broadcast-post-to-portal"
              className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 cursor-pointer"
            >
              <input
                id="broadcast-post-to-portal"
                type="checkbox"
                name="postToPortal"
                aria-label="Portal announcement"
                defaultChecked
                className="h-4 w-4 rounded border-line text-primary-800"
              />
              <span className="text-sm font-medium text-primary-950">Portal announcement</span>
            </label>
            <label
              htmlFor="broadcast-send-email"
              className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 cursor-pointer"
            >
              <input
                id="broadcast-send-email"
                type="checkbox"
                name="sendEmail"
                aria-label="Email"
                defaultChecked
                className="h-4 w-4 rounded border-line text-primary-800"
              />
              <span className="text-sm font-medium text-primary-950">Email</span>
            </label>
          </div>
          <p className="text-xs text-slate mt-2">SMS isn&apos;t available yet.</p>
          <FieldError messages={fe.sendEmail} />
        </fieldset>

        <div>
          <p className="block text-sm font-medium text-primary-950 mb-1.5">
            Message<span className="text-danger ml-0.5">*</span>
          </p>
          <RichTextEditor name="bodyHtml" allowImages={false} label="Message" />
          <FieldError messages={fe.bodyHtml} />
        </div>

        <PatronFileField
          name="attachment"
          label="Attachment (optional)"
          hint="A letter, notice or agenda. Recipients get a link to it."
          errors={fe.attachment}
          ticketUrl="/api/admin/attachment/ticket"
          fallbackUrl="/api/admin/attachment"
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
            {isPending ? "Sending…" : "Send now"}
          </Button>
          <p className="text-xs text-slate">
            Executives send directly — there&apos;s no approval step. Sending to a large group can take a moment; keep
            this page open.
          </p>
        </div>
      </form>

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Broadcast sent"
        againLabel="Write another"
        onAgain={resetForm}
        listHref="/admin/broadcasts"
        listLabel="Done"
      />
    </>
  );
}
