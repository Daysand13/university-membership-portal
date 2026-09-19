"use client";

import { useActionState, useState } from "react";
import { Building2, CheckCircle2, Globe, Loader2, MailCheck, User } from "lucide-react";
import { registerAllyAction } from "@/lib/actions/public-outreach-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
import { ALLY_TYPES } from "@/lib/outreach-options";

// ---------------------------------------------------------------------------
// Joining the network
// ---------------------------------------------------------------------------

/**
 * "Join the Ally Network" — no account, no password. After sending it the
 * form says to check your inbox, not "you're in": nothing happens until the
 * confirmation link is clicked.
 */
export function AllySignupForm() {
  const [state, formAction, isPending] = useActionState(registerAllyAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div role="status" className="rounded-xl border border-success bg-success-light p-6 text-center">
        <MailCheck size={30} aria-hidden="true" className="mx-auto text-success" />
        <p className="mt-3 font-display font-bold text-xl text-primary-950">Check your inbox</p>
        <p className="mt-1.5 text-[15px] text-ink max-w-md mx-auto">
          We&apos;ve sent you an email with a link to confirm your address. Once you click it, you&apos;re in the
          network. If it doesn&apos;t arrive in a few minutes, check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      <BotProtectionFields />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ally-name" required>
            Full name
          </Label>
          <input id="ally-name" name="fullName" required autoComplete="name" maxLength={150} className={inputClasses} />
          <FieldError messages={fe.fullName} />
        </div>
        <div>
          <Label htmlFor="ally-email" required>
            Email address
          </Label>
          <input
            id="ally-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            className={inputClasses}
          />
          <FieldError messages={fe.email} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-primary-950 mb-2">I&apos;m joining as</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALLY_TYPES.map((type, index) => (
            <label
              key={type.value}
              className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                type="radio"
                name="type"
                value={type.value}
                defaultChecked={index === 0}
                className="h-4 w-4 text-primary-800"
              />
              <span className="flex items-center gap-2 text-sm font-semibold text-primary-950">
                {type.value === "CORPORATE" ? (
                  <Building2 size={16} aria-hidden="true" />
                ) : (
                  <User size={16} aria-hidden="true" />
                )}
                {type.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.type} />
      </fieldset>

      <div>
        <Label htmlFor="ally-organization">Organisation / role (optional)</Label>
        <input
          id="ally-organization"
          name="organization"
          maxLength={200}
          autoComplete="organization"
          className={inputClasses}
          placeholder="e.g. Accessibility Lead, Ghana Digital Access"
        />
        <p className="text-xs text-slate mt-1">Only needed if you&apos;d like to be listed on this page.</p>
        <FieldError messages={fe.organization} />
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-3 cursor-pointer">
        <input type="checkbox" name="wantsListing" className="mt-1 h-4 w-4 rounded border-line text-primary-800" />
        <span>
          <span className="block text-sm font-semibold text-primary-950">
            I would like to be considered for listing as a public Ally on this page.
          </span>
          <span className="block text-xs text-slate mt-0.5">
            The association&apos;s team will be in touch before anything about you is published.
          </span>
        </span>
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <CheckCircle2 size={17} aria-hidden="true" />}
          {isPending ? "Sending…" : "Register as an Ally"}
        </Button>
        <p className="text-xs text-slate">We&apos;ll only email you about the association&apos;s work. Unsubscribe any time.</p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// The showcase, with its filter
// ---------------------------------------------------------------------------

export interface ShowcaseAlly {
  id: string;
  type: "INDIVIDUAL" | "CORPORATE";
  name: string;
  imageUrl: string | null;
  role: string | null;
  organization: string | null;
  sector: string | null;
  statement: string | null;
  websiteUrl: string | null;
}

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "INDIVIDUAL", label: "Individual Allies" },
  { value: "CORPORATE", label: "Corporate & Institutional Allies" },
] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function IndividualCard({ ally }: { ally: ShowcaseAlly }) {
  const role = [ally.role, ally.organization].filter(Boolean).join(", ");
  return (
    <article className="h-full bg-white rounded-xl border border-line shadow-card p-6 flex flex-col items-center text-center">
      <span className="w-24 h-24 rounded-full overflow-hidden bg-primary-50 text-primary-800 flex items-center justify-center font-display font-bold text-2xl">
        {ally.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ally.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials(ally.name)}</span>
        )}
      </span>
      <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{ally.name}</h3>
      {role && <p className="text-sm text-slate mt-0.5">{role}</p>}
      {ally.statement && (
        <blockquote className="mt-3 text-[15px] italic text-ink leading-relaxed">&ldquo;{ally.statement}&rdquo;</blockquote>
      )}
    </article>
  );
}

function CorporateCard({ ally }: { ally: ShowcaseAlly }) {
  return (
    <article className="h-full bg-white rounded-xl border border-line shadow-card p-6 flex flex-col">
      <div className="h-20 flex items-center justify-center rounded-lg bg-[#ffffff] border border-line p-3">
        {ally.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ally.imageUrl} alt={`${ally.name} logo`} className="max-h-full max-w-full object-contain" />
        ) : (
          <Building2 size={30} aria-hidden="true" className="text-primary-800" />
        )}
      </div>
      <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{ally.name}</h3>
      {ally.sector && (
        <p className="mt-1">
          <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
            {ally.sector}
          </span>
        </p>
      )}
      {ally.statement && <p className="mt-3 text-[15px] text-ink leading-relaxed">{ally.statement}</p>}
      {ally.websiteUrl && (
        <a
          href={ally.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
        >
          <Globe size={14} aria-hidden="true" /> Visit website<span className="sr-only"> of {ally.name} (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}

/**
 * The featured allies, filterable without reloading the page. The filter is
 * a set of pressed/unpressed buttons rather than tabs: it narrows one list,
 * it doesn't switch between panels.
 */
export function AllyShowcase({ allies }: { allies: ShowcaseAlly[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL");
  const shown = filter === "ALL" ? allies : allies.filter((a) => a.type === filter);
  const count = (value: (typeof FILTERS)[number]["value"]) =>
    value === "ALL" ? allies.length : allies.filter((a) => a.type === value).length;

  return (
    <div>
      <div role="group" aria-label="Show" className="flex flex-wrap justify-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`min-h-11 px-4 rounded-full border text-sm font-semibold ${
              filter === option.value
                ? "bg-primary-800 border-primary-800 text-white"
                : "bg-white border-line text-primary-950 hover:border-primary-400"
            }`}
          >
            {option.label} <span className="font-normal">({count(option.value)})</span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "ally" : "allies"}
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((ally) => (
          <li key={ally.id}>
            {ally.type === "CORPORATE" ? <CorporateCard ally={ally} /> : <IndividualCard ally={ally} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirming and unsubscribing
// ---------------------------------------------------------------------------

/**
 * The button on the confirm and unsubscribe pages. A button rather than the
 * link doing it by itself, because mail providers open links in emails to
 * scan them — a link that acted on its own would confirm or unsubscribe
 * people who never clicked anything.
 */
export function TokenActionPanel({
  action,
  label,
  doneTitle,
  doneText,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  doneTitle: string;
  doneText: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);

  if (state.success) {
    return (
      <div role="status" className="text-center">
        <CheckCircle2 size={34} aria-hidden="true" className="mx-auto text-success" />
        <p className="mt-3 font-display font-bold text-xl text-primary-950">{doneTitle}</p>
        <p className="mt-1.5 text-[15px] text-slate">{doneText}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="text-center space-y-4">
      <FormAlert message={state.error} />
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending && <Loader2 size={17} aria-hidden="true" className="animate-spin" />}
        {label}
      </Button>
    </form>
  );
}
