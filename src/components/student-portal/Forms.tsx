"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { Loader2, Send, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { ISSUE_CATEGORIES } from "@/lib/patron-portal-options";
import { SUPPORT_REQUEST_TYPES } from "@/lib/portal-options";
import {
  createStudyGroupAction,
  reportBarrierAction,
  requestMentorAction,
  requestSupportAction,
} from "@/lib/actions/student-portal-actions";
import { EvidenceField } from "./EvidenceField";
import type { ActionState } from "@/lib/actions/types";

/**
 * The forms a student fills in: reporting a barrier, asking for support,
 * starting a study group and asking a graduate to mentor them.
 *
 * Every one is written for someone describing a hard day, not filling in a
 * record: short labels, plain hints, and nothing marked required that we
 * can do without.
 */

/** A one-click action (join, leave, withdraw) with a pending state. */
export function PortalActionButton({
  action,
  children,
  pendingLabel,
  variant = "secondary",
  confirm,
}: {
  action: () => Promise<void>;
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const classes =
    variant === "primary"
      ? "bg-primary-800 text-white hover:bg-primary-700 border-primary-800"
      : variant === "danger"
        ? "border-danger/30 text-danger hover:bg-danger-light"
        : "border-line text-primary-950 hover:bg-surface-muted";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          await action();
        });
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3.5 py-2 min-h-11 text-sm font-semibold disabled:opacity-60 ${classes}`}
    >
      {isPending && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
      {isPending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Reporting a barrier
// ---------------------------------------------------------------------------

export function BarrierReportForm() {
  const [state, formAction, isPending] = useActionState(reportBarrierAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />

      <div>
        <Label htmlFor="report-title" required>
          What happened, in a few words
        </Label>
        <input
          id="report-title"
          name="title"
          required
          maxLength={200}
          className={inputClasses}
          placeholder="e.g. Lift in the Science block locked again"
        />
        <FieldError messages={fe.title} />
      </div>

      <div>
        <Label htmlFor="report-category" required>
          What is this about?
        </Label>
        <select id="report-category" name="category" required defaultValue="" className={inputClasses}>
          <option value="" disabled>
            Choose one…
          </option>
          {ISSUE_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <FieldError messages={fe.category} />
      </div>

      <div>
        <Label htmlFor="report-description" required>
          Tell us what happened
        </Label>
        <p className="text-xs text-slate mb-1.5">
          What you were trying to do, what stopped you, and what it meant for you. Write as much or as little as you
          like — or record it and attach the voice note below.
        </p>
        <textarea id="report-description" name="description" rows={6} required maxLength={5000} className={inputClasses} />
        <FieldError messages={fe.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="report-location">Where on campus</Label>
          <input
            id="report-location"
            name="location"
            maxLength={200}
            className={inputClasses}
            placeholder="e.g. North Campus, Block B"
          />
          <FieldError messages={fe.location} />
        </div>
        <div>
          <Label htmlFor="report-date">When it happened</Label>
          <input id="report-date" name="occurredOn" type="date" className={inputClasses} />
          <FieldError messages={fe.occurredOn} />
        </div>
      </div>

      <EvidenceField errors={fe.evidence} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
          {isPending ? "Sending…" : "Send this report"}
        </Button>
        <p className="text-xs text-slate max-w-md">
          It goes to the association&apos;s executives. If they can&apos;t settle it on campus, they escalate a summary
          to the patrons — without your name or anything you attached.
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Asking for support
// ---------------------------------------------------------------------------

export function SupportRequestForm() {
  const [type, setType] = useState<string>("ASSISTIVE_TECH");
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await requestSupportAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};
  const chosen = SUPPORT_REQUEST_TYPES.find((t) => t.value === type);

  return (
    <form action={formAction} className="space-y-5" key={resetKey}>
      {state.success ? (
        <FormAlert variant="success" message="Sent. The executives will look at it and you'll hear back by email." />
      ) : (
        <FormAlert message={state.error} />
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">What do you need?</legend>
        <div className="grid gap-2">
          {SUPPORT_REQUEST_TYPES.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
                className="mt-1 h-4 w-4 text-primary-800"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-primary-950">{option.label}</span>
                <span className="block text-xs text-slate mt-0.5">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.type} />
      </fieldset>

      <div>
        <Label htmlFor="support-details" required>
          Tell us more
        </Label>
        <textarea
          id="support-details"
          name="details"
          rows={5}
          required
          maxLength={3000}
          className={inputClasses}
          placeholder={
            chosen?.value === "NOTE_TAKER"
              ? "Which course, which lectures, and what would help most."
              : "What you need and what it's for."
          }
        />
        <FieldError messages={fe.details} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {chosen?.needsAmount && (
          <div>
            <Label htmlFor="support-amount" required>
              How much do you need? (GH₵)
            </Label>
            <input id="support-amount" name="amount" inputMode="decimal" className={inputClasses} placeholder="e.g. 400" />
            <FieldError messages={fe.amount} />
          </div>
        )}
        <div>
          <Label htmlFor="support-needed-by">Needed by</Label>
          <input id="support-needed-by" name="neededBy" type="date" className={inputClasses} />
          <FieldError messages={fe.neededBy} />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
        {isPending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Study groups
// ---------------------------------------------------------------------------

export function StudyGroupForm() {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createStudyGroupAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" key={resetKey}>
      {state.success ? (
        <FormAlert variant="success" message="Your group is up. Other students can join it now." />
      ) : (
        <FormAlert message={state.error} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="group-name" required>
            Group name
          </Label>
          <input id="group-name" name="name" required maxLength={120} className={inputClasses} placeholder="e.g. Thursday Braille Study Circle" />
          <FieldError messages={fe.name} />
        </div>
        <div>
          <Label htmlFor="group-focus" required>
            Course or subject
          </Label>
          <input id="group-focus" name="focus" required maxLength={120} className={inputClasses} placeholder="e.g. EDU 302" />
          <FieldError messages={fe.focus} />
        </div>
      </div>

      <div>
        <Label htmlFor="group-description">What the group is for</Label>
        <textarea id="group-description" name="description" rows={3} maxLength={1000} className={inputClasses} />
        <FieldError messages={fe.description} />
      </div>

      <div>
        <Label htmlFor="group-meeting">When and where you meet</Label>
        <input
          id="group-meeting"
          name="meetingInfo"
          maxLength={300}
          className={inputClasses}
          placeholder="e.g. Thursdays 4pm, Resource Centre"
        />
        <FieldError messages={fe.meetingInfo} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
        {isPending ? "Creating…" : "Start the group"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Asking for a mentor
// ---------------------------------------------------------------------------

export function MentorRequestForm({ alumniId, mentorName }: { alumniId: string; mentorName: string }) {
  const [state, formAction, isPending] = useActionState(requestMentorAction, {});
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <FormAlert variant="success" message={`Asked. ${mentorName} has been emailed and will accept or decline.`} />
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert message={state.error} />
      <input type="hidden" name="alumniId" value={alumniId} />
      <div>
        <Label htmlFor={`mentor-note-${alumniId}`} required>
          What would you like help with?
        </Label>
        <textarea
          id={`mentor-note-${alumniId}`}
          name="requestNote"
          rows={3}
          required
          maxLength={2000}
          className={inputClasses}
          placeholder="A sentence or two about where you are and what you're hoping for."
        />
        <FieldError messages={fe.requestNote} />
        <FieldError messages={fe.alumniId} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <UserPlus size={16} aria-hidden="true" />}
        {isPending ? "Sending…" : `Ask ${mentorName.split(" ")[0]}`}
      </Button>
    </form>
  );
}
