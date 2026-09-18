"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, Briefcase, HandHeart, Loader2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, SavedNotice, inputClasses } from "@/components/ui/Common";
import {
  DONATION_FUNDS,
  DONATION_PRESETS_CEDIS,
  MAX_DONATION_CEDIS,
  MIN_DONATION_CEDIS,
} from "@/lib/patron-portal-options";
import { OPPORTUNITY_TYPES } from "@/lib/portal-options";
import {
  coSignCampaignAction,
  postOpportunityAction,
  respondToRequestAction,
  saveMentorSettingsAction,
  startAlumniDonationAction,
} from "@/lib/actions/alumni-portal-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";

/**
 * What a graduate fills in: a gift, a posting for the opportunity board,
 * their mentoring availability, an answer to a student's request, and their
 * name on a campaign.
 */

// ---------------------------------------------------------------------------
// Giving
// ---------------------------------------------------------------------------

export function AlumniGivingForm({ onlineGivingEnabled }: { onlineGivingEnabled: boolean }) {
  const [state, formAction, isPending] = useActionState(startAlumniDonationAction, initialActionState);
  const [preset, setPreset] = useState<string>("100");
  const [custom, setCustom] = useState("");
  const fe = state.fieldErrors ?? {};
  const amount = preset === "custom" ? custom : preset;

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <input type="hidden" name="amount" value={amount} />

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Amount (GH₵)</legend>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[...DONATION_PRESETS_CEDIS.map(String), "custom"].map((value) => (
            <label
              key={value}
              className={`flex items-center justify-center min-h-11 rounded-lg border text-sm font-semibold cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 ${
                preset === value
                  ? "border-primary-800 bg-primary-800 text-white"
                  : "border-line bg-white text-primary-950 hover:border-primary-400"
              }`}
            >
              <input
                type="radio"
                name="amountChoice"
                value={value}
                checked={preset === value}
                onChange={() => setPreset(value)}
                className="sr-only"
              />
              {value === "custom" ? "Other" : Number(value).toLocaleString("en-GH")}
            </label>
          ))}
        </div>
        {preset === "custom" && (
          <div className="mt-3">
            <label htmlFor="alumni-custom-amount" className="block text-sm font-medium text-primary-950 mb-1.5">
              Your amount in cedis
            </label>
            <input
              id="alumni-custom-amount"
              inputMode="decimal"
              autoComplete="off"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={`${MIN_DONATION_CEDIS} – ${MAX_DONATION_CEDIS.toLocaleString("en-GH")}`}
              className={`${inputClasses} max-w-xs`}
            />
          </div>
        )}
        <FieldError messages={fe.amount} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Give to</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DONATION_FUNDS.map((fund, i) => (
            <label
              key={fund.value}
              className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input type="radio" name="fund" value={fund.value} defaultChecked={i === 0} className="mt-1 h-4 w-4 text-primary-800" />
              <span>
                <span className="block text-sm font-semibold text-primary-950">{fund.label}</span>
                <span className="block text-xs text-slate mt-0.5">{fund.description}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.fund} />
      </fieldset>

      <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-3 cursor-pointer">
        <input type="checkbox" name="anonymous" className="mt-1 h-4 w-4 rounded border-line text-primary-800" />
        <span>
          <span className="block text-sm font-semibold text-primary-950">Give anonymously</span>
          <span className="block text-xs text-slate mt-0.5">
            Your gift is never listed publicly either way — this keeps your name out of the association&apos;s own
            records of who gave.
          </span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending || !onlineGivingEnabled || !amount}>
          {isPending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <HandHeart size={17} aria-hidden="true" />}
          {isPending ? "Opening secure checkout…" : "Give Now"}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-slate">
          <Lock size={13} aria-hidden="true" /> Secure payment by Paystack: Mobile Money or card.
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// The opportunity board
// ---------------------------------------------------------------------------

export function OpportunityForm() {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await postOpportunityAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" key={resetKey}>
      {state.success ? (
        <FormAlert
          variant="success"
          message="Thank you — it's with the association for a quick check, and we'll email you when it's live."
        />
      ) : (
        <FormAlert message={state.error} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="opp-title" required>
            Role or opportunity
          </Label>
          <input id="opp-title" name="title" required maxLength={200} className={inputClasses} placeholder="e.g. Junior Accessibility Analyst" />
          <FieldError messages={fe.title} />
        </div>
        <div>
          <Label htmlFor="opp-org" required>
            Organisation
          </Label>
          <input id="opp-org" name="organization" required maxLength={200} className={inputClasses} />
          <FieldError messages={fe.organization} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="opp-type" required>
            Kind
          </Label>
          <select id="opp-type" name="type" defaultValue="JOB" className={inputClasses}>
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.type} />
        </div>
        <div>
          <Label htmlFor="opp-location">Location</Label>
          <input id="opp-location" name="location" maxLength={200} className={inputClasses} placeholder="e.g. Accra, or Remote" />
          <FieldError messages={fe.location} />
        </div>
        <div>
          <Label htmlFor="opp-closing">Closing date</Label>
          <input id="opp-closing" name="closingDate" type="date" className={inputClasses} />
          <FieldError messages={fe.closingDate} />
        </div>
      </div>

      <div>
        <Label htmlFor="opp-description" required>
          What the role involves
        </Label>
        <p className="text-xs text-slate mb-1.5">
          Say what the work is, what someone needs to bring, and anything about how accessible the workplace is.
        </p>
        <textarea id="opp-description" name="description" rows={5} required maxLength={5000} className={inputClasses} />
        <FieldError messages={fe.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="opp-url">Where to apply (link)</Label>
          <input id="opp-url" name="applyUrl" type="url" maxLength={500} className={inputClasses} placeholder="https://…" />
          <FieldError messages={fe.applyUrl} />
        </div>
        <div>
          <Label htmlFor="opp-email">Or an email address</Label>
          <input id="opp-email" name="applyEmail" type="email" maxLength={254} className={inputClasses} />
          <FieldError messages={fe.applyEmail} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Briefcase size={16} aria-hidden="true" />}
          {isPending ? "Posting…" : "Post the opportunity"}
        </Button>
        <p className="text-xs text-slate">An administrator checks each posting before students see it.</p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Mentoring
// ---------------------------------------------------------------------------

export function MentorSettingsForm({
  willingToMentor,
  availability,
  capacity,
}: {
  willingToMentor: boolean;
  availability: string | null;
  capacity: number;
}) {
  const [state, formAction, isPending] = useActionState(saveMentorSettingsAction, initialActionState);
  const [on, setOn] = useState(willingToMentor);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />

      <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-3 cursor-pointer">
        <input
          type="checkbox"
          name="willingToMentor"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-line text-primary-800"
        />
        <span>
          <span className="block text-sm font-semibold text-primary-950">I&apos;m available to mentor a student</span>
          <span className="block text-xs text-slate mt-0.5">
            You&apos;ll be listed for students to ask. You can decline any request, and turn this off at any time.
          </span>
        </span>
      </label>

      {on && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="mentor-availability">When you&apos;re usually free</Label>
            <input
              id="mentor-availability"
              name="mentorAvailability"
              maxLength={300}
              defaultValue={availability ?? ""}
              className={inputClasses}
              placeholder="e.g. Weekday evenings, on WhatsApp calls"
            />
            <FieldError messages={fe.mentorAvailability} />
          </div>
          <div>
            <Label htmlFor="mentor-capacity">How many students at once</Label>
            <input
              id="mentor-capacity"
              name="mentorCapacity"
              type="number"
              min={1}
              max={20}
              defaultValue={capacity}
              className={`${inputClasses} max-w-[7rem]`}
            />
            <FieldError messages={fe.mentorCapacity} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Save size={16} aria-hidden="true" />}
          {isPending ? "Saving…" : "Save"}
        </Button>
        <SavedNotice state={state} isPending={isPending}>
          Saved. Your mentoring details are up to date.
        </SavedNotice>
      </div>
    </form>
  );
}

/** Accepting or declining a student's request. */
export function MentorshipResponseForm({ mentorshipId, studentName }: { mentorshipId: string; studentName: string }) {
  const respond = respondToRequestAction.bind(null, mentorshipId);
  const [decision, setDecision] = useState<"ACCEPT" | "DECLINE">("ACCEPT");
  const [state, formAction, isPending] = useActionState(respond, initialActionState);
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <FormAlert
        variant="success"
        message={decision === "ACCEPT" ? `You're now mentoring ${studentName}.` : `${studentName} has been told, kindly.`}
      />
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={state.error} />

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">Your answer</legend>
        <div className="flex flex-wrap gap-2">
          {(["ACCEPT", "DECLINE"] as const).map((value) => (
            <label
              key={value}
              className={`flex items-center justify-center min-h-11 px-4 rounded-lg border text-sm font-semibold cursor-pointer ${
                decision === value ? "border-primary-800 bg-primary-800 text-white" : "border-line bg-white text-primary-950"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                onChange={() => setDecision(value)}
                className="sr-only"
              />
              {value === "ACCEPT" ? `Yes, mentor ${studentName.split(" ")[0]}` : "Not right now"}
            </label>
          ))}
        </div>
        <FieldError messages={fe.decision} />
      </fieldset>

      {decision === "ACCEPT" ? (
        <div>
          <Label htmlFor={`goals-${mentorshipId}`}>What you&apos;ll work on together</Label>
          <textarea
            id={`goals-${mentorshipId}`}
            name="goals"
            rows={3}
            maxLength={1000}
            className={inputClasses}
            placeholder="Optional — a line you'll both see at the top of the conversation."
          />
          <FieldError messages={fe.goals} />
        </div>
      ) : (
        <div>
          <Label htmlFor={`decline-${mentorshipId}`} required>
            A short reason
          </Label>
          <p className="text-xs text-slate mb-1.5">Shared with the student so they know to ask someone else.</p>
          <textarea id={`decline-${mentorshipId}`} name="declineReason" rows={2} maxLength={500} className={inputClasses} />
          <FieldError messages={fe.declineReason} />
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
        {isPending ? "Sending…" : "Send your answer"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Backing a campaign
// ---------------------------------------------------------------------------

export function CoSignForm({ campaignId, signed, open }: { campaignId: string; signed: boolean; open: boolean }) {
  const coSign = coSignCampaignAction.bind(null, campaignId);
  const [state, formAction, isPending] = useActionState(coSign, initialActionState);

  if (signed || state.success) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
        <BadgeCheck size={17} aria-hidden="true" /> You&apos;ve co-signed this campaign.
      </p>
    );
  }
  if (!open) return <p className="text-sm text-slate">This campaign is closed to new signatures.</p>;

  return (
    <form action={formAction} className="space-y-3">
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor={`cosign-${campaignId}`}>Add a few words (optional)</Label>
        <textarea
          id={`cosign-${campaignId}`}
          name="comment"
          rows={2}
          maxLength={500}
          className={inputClasses}
          placeholder="Why this matters to you as a graduate."
        />
        <FieldError messages={state.fieldErrors?.comment} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <BadgeCheck size={16} aria-hidden="true" />}
        {isPending ? "Signing…" : "Add my name"}
      </Button>
    </form>
  );
}
