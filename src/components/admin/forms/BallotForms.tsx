"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Clock, Loader2, Megaphone, Plus, Save, TimerReset, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import { SuccessDialog, useResettableForm } from "@/components/ui/SuccessDialog";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  addCandidateAction,
  addPositionAction,
  extendVotingAction,
  registerStationAction,
  reissueStationKeyAction,
  reviewCandidateAction,
  setElectionPhaseAction,
  setResultsPublicAction,
  setVotingWindowAction,
} from "@/lib/actions/ballot-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { dateToAccraInput } from "@/lib/validations/elections";
import { ElectionPhase } from "@/generated/prisma/enums";

/**
 * The Electoral Commission's own controls.
 *
 * Everything here is done while people are queueing at a terminal
 * somewhere, so each form says plainly what will happen in the halls when
 * the button is pressed.
 */

function SubmitRow({
  isPending,
  label,
  pendingLabel = "Saving…",
  icon,
  children,
}: {
  isPending: boolean;
  label: string;
  pendingLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : icon}
        {isPending ? pendingLabel : label}
      </Button>
      {children}
    </div>
  );
}

// --- When voting happens ---------------------------------------------------

export function VotingWindowForm({
  electionId,
  opensAt,
  closesAt,
}: {
  electionId: string;
  opensAt: Date | null;
  closesAt: Date | null;
}) {
  const [state, formAction, isPending] = useActionState(
    setVotingWindowAction.bind(null, electionId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="opensAt" required>
            Voting opens
          </Label>
          <input
            id="opensAt"
            name="opensAt"
            type="datetime-local"
            defaultValue={dateToAccraInput(opensAt)}
            className={inputClasses}
          />
          <FieldError messages={fe.opensAt} />
        </div>
        <div>
          <Label htmlFor="closesAt" required>
            Voting closes
          </Label>
          <input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            defaultValue={dateToAccraInput(closesAt)}
            className={inputClasses}
          />
          <FieldError messages={fe.closesAt} />
        </div>
      </div>
      <p className="text-xs text-slate">
        Ghana time. The terminals count down to the closing time and announce it aloud at two hours, one hour, forty,
        thirty, twenty, ten, five and two minutes.
      </p>
      <SubmitRow isPending={isPending} label="Save the times" icon={<Clock size={16} aria-hidden="true" />}>
        <SavedNotice state={state} isPending={isPending} />
      </SubmitRow>
    </form>
  );
}

export function ExtendVotingForm({ electionId }: { electionId: string }) {
  const [state, formAction, isPending] = useActionState(
    extendVotingAction.bind(null, electionId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert message={state.error} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <Label htmlFor="minutes" required>
            Add minutes
          </Label>
          <input id="minutes" name="minutes" type="number" min={5} max={720} defaultValue={30} className={inputClasses} />
        </div>
        <SubmitRow
          isPending={isPending}
          label="Add the time"
          pendingLabel="Adding…"
          icon={<TimerReset size={16} aria-hidden="true" />}
        >
          <SavedNotice state={state} isPending={isPending} />
        </SubmitRow>
      </div>
      <FieldError messages={fe.minutes} />
      <p className="text-xs text-slate">
        Counts from the current closing time, or from now if that has already gone by.
      </p>
    </form>
  );
}

export function PhaseForm({
  electionId,
  phase,
  notice,
}: {
  electionId: string;
  phase: ElectionPhase;
  notice: string | null;
}) {
  const [chosen, setChosen] = useState<string>(phase);
  const [state, formAction, isPending] = useActionState(
    setElectionPhaseAction.bind(null, electionId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="phase" required>
          What is happening
        </Label>
        <select
          id="phase"
          name="phase"
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className={inputClasses}
        >
          <option value={ElectionPhase.SCHEDULED}>Follow the times above</option>
          <option value={ElectionPhase.OPEN}>Open it now, ahead of time</option>
          <option value={ElectionPhase.POSTPONED}>Postpone it</option>
          <option value={ElectionPhase.CLOSED}>Close it now</option>
        </select>
        <FieldError messages={fe.phase} />
      </div>
      <div>
        <Label htmlFor="notice" required={chosen === ElectionPhase.POSTPONED}>
          Notice for the terminals and the website
        </Label>
        <textarea
          id="notice"
          name="notice"
          rows={2}
          maxLength={500}
          defaultValue={notice ?? ""}
          className={inputClasses}
          placeholder="e.g. Voting is postponed to Friday 20 November after a power failure at the main hall."
        />
        <FieldError messages={fe.notice} />
      </div>
      <SubmitRow
        isPending={isPending}
        label="Tell the terminals"
        pendingLabel="Telling them…"
        icon={<Megaphone size={16} aria-hidden="true" />}
      >
        <SavedNotice state={state} isPending={isPending} />
      </SubmitRow>
    </form>
  );
}

export function ResultsSwitch({ electionId, isPublic }: { electionId: string; isPublic: boolean }) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary-950">
          {isPublic ? "Results are on the public page" : "Results are hidden from the public"}
        </p>
        <p className="text-xs text-slate mt-0.5">
          {isPublic
            ? "Anyone can watch the count as it stands."
            : "The page says the commission is holding the results back."}
        </p>
      </div>
      <Button
        type="button"
        variant={isPublic ? "outline" : "primary"}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await setResultsPublicAction(electionId, !isPublic);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
        {isPublic ? "Hide them" : "Show them"}
      </Button>
    </div>
  );
}

// --- The ballot paper ------------------------------------------------------

export function PositionForm({ electionId, nextOrder }: { electionId: string; nextOrder: number }) {
  const [state, formAction, isPending] = useActionState(addPositionAction.bind(null, electionId), initialActionState);
  const { formKey, formRef, resetForm } = useResettableForm();
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <Label htmlFor="title" required>
            Post
          </Label>
          <input id="title" name="title" placeholder="e.g. President" className={inputClasses} />
        </div>
        <div className="w-24">
          <Label htmlFor="order">Order</Label>
          <input id="order" name="order" type="number" min={0} max={99} defaultValue={nextOrder} className={inputClasses} />
        </div>
        <SubmitRow isPending={isPending} label="Add" pendingLabel="Adding…" icon={<Plus size={16} aria-hidden="true" />} />
      </form>
      <FieldError messages={fe.title} />
      <FormAlert message={state.error} />

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Post added to the ballot"
        description="Candidates can now be put forward for it."
        againLabel="Add another post"
        onAgain={resetForm}
        listHref={`/admin/elections/${electionId}`}
        listLabel="Done"
      />
    </>
  );
}

export function CandidateForm({
  electionId,
  positions,
}: {
  electionId: string;
  positions: { id: string; title: string }[];
}) {
  const [state, formAction, isPending] = useActionState(addCandidateAction.bind(null, electionId), initialActionState);
  const { formKey, formRef, resetForm } = useResettableForm();
  const fe = state.fieldErrors ?? {};

  if (positions.length === 0) {
    return <p className="text-sm text-slate">Add the posts being contested first — a candidate stands for one of them.</p>;
  }

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="space-y-4">
        <FormAlert message={state.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" required>
              Name
            </Label>
            <input id="name" name="name" className={inputClasses} />
            <FieldError messages={fe.name} />
          </div>
          <div>
            <Label htmlFor="positionId" required>
              Standing for
            </Label>
            <select id="positionId" name="positionId" className={inputClasses}>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                </option>
              ))}
            </select>
            <FieldError messages={fe.positionId} />
          </div>
        </div>
        <ImageUploadField name="photoUrl" category="PROFILE" label="Photo" aspect="aspect-square" />
        <div>
          <Label htmlFor="manifesto">What they are standing on</Label>
          <textarea id="manifesto" name="manifesto" rows={3} maxLength={3000} className={inputClasses} />
        </div>
        <SubmitRow isPending={isPending} label="Add the candidate" icon={<UserPlus size={16} aria-hidden="true" />} />
      </form>

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Candidate added"
        description="They are on the ballot paper the terminals will show."
        againLabel="Add another candidate"
        onAgain={resetForm}
        listHref={`/admin/elections/${electionId}`}
        listLabel="Done"
      />
    </>
  );
}

export function CandidateReviewForm({
  candidateId,
  electionId,
  status,
}: {
  candidateId: string;
  electionId: string;
  status: string;
}) {
  const [state, formAction, isPending] = useActionState(
    reviewCandidateAction.bind(null, candidateId, electionId),
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert message={state.error} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label htmlFor={`status-${candidateId}`}>Decision</Label>
          <select id={`status-${candidateId}`} name="status" defaultValue={status} className={inputClasses}>
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Turn down</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
        <div className="flex-1 min-w-[14rem]">
          <Label htmlFor={`note-${candidateId}`}>Reason</Label>
          <input id={`note-${candidateId}`} name="note" maxLength={500} className={inputClasses} />
        </div>
        <SubmitRow isPending={isPending} label="Save" icon={<Save size={16} aria-hidden="true" />}>
          <SavedNotice state={state} isPending={isPending} />
        </SubmitRow>
      </div>
      <FieldError messages={fe.note} />
    </form>
  );
}

// --- Terminals -------------------------------------------------------------

export function RegisterStationForm() {
  const [state, formAction, isPending] = useActionState(registerStationAction, initialActionState);
  const { formKey, formRef, resetForm } = useResettableForm();
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <form ref={formRef} key={formKey} action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label htmlFor="code" required>
            Code
          </Label>
          <input id="code" name="code" placeholder="LIB-1" className={`${inputClasses} font-data uppercase`} />
        </div>
        <div className="flex-1 min-w-[14rem]">
          <Label htmlFor="name" required>
            Where it stands
          </Label>
          <input id="name" name="name" placeholder="Main Library, ground floor" className={inputClasses} />
        </div>
        <SubmitRow
          isPending={isPending}
          label="Register it"
          pendingLabel="Registering…"
          icon={<Plus size={16} aria-hidden="true" />}
        />
      </form>
      <FieldError messages={fe.code} />
      <FieldError messages={fe.name} />
      <FormAlert message={state.error} />

      <SuccessDialog
        state={state}
        isPending={isPending}
        title="Terminal registered"
        againLabel="Register another"
        onAgain={resetForm}
        listHref="/admin/elections/stations"
        listLabel="Done"
      />
    </>
  );
}

export function ReissueKeyForm({ stationId, code }: { stationId: string; code: string }) {
  // No form and no fields — a button, a confirmation, and a key that has
  // to be read once and written down.
  const [outcome, setOutcome] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Give ${code} a new key? The one it has now stops working immediately.`)) return;
          startTransition(async () => {
            setOutcome({ success: true, message: await reissueStationKeyAction(stationId) });
          });
        }}
        className="text-xs font-semibold text-primary-800 hover:text-accent-600 disabled:opacity-50"
      >
        {pending ? "Issuing…" : "New key"}
      </button>

      <SuccessDialog
        state={outcome}
        isPending={pending}
        title={`New key for ${code}`}
        againLabel="I have written it down"
        againIcon={<Check size={16} aria-hidden="true" />}
        onAgain={() => undefined}
        listHref="/admin/elections/stations"
        listLabel="Done"
      />
    </>
  );
}
