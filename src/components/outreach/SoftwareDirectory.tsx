"use client";

import { useActionState, useState } from "react";
import { Loader2, MonitorSmartphone, Send, SendHorizontal } from "lucide-react";
import { submitSoftwareRequestAction } from "@/lib/actions/public-outreach-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
import {
  REQUEST_OPERATING_SYSTEMS,
  SOFTWARE_CATEGORIES,
  softwareCategoryLabel,
  softwarePlatformLabel,
} from "@/lib/outreach-options";

export interface DirectorySoftware {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string;
  platforms: string[];
  description: string;
  isFree: boolean;
  telegramUrl: string | null;
}

const FILTERS = [{ value: "ALL", label: "All Categories" }, ...SOFTWARE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))];

/**
 * The software directory, with its category filter. Every tool's button
 * goes to its post in the Telegram library, or to the library itself when
 * the post hasn't been linked.
 */
export function SoftwareDirectory({
  software,
  libraryUrl,
}: {
  software: DirectorySoftware[];
  libraryUrl: string | null;
}) {
  const [filter, setFilter] = useState("ALL");
  const shown = filter === "ALL" ? software : software.filter((s) => s.category === filter);

  return (
    <div>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
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
            {option.label}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "tool" : "tools"}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 text-slate">
          Nothing in this category yet. If you need something here, request it below.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((tool) => {
            const href = tool.telegramUrl || libraryUrl;
            return (
              <li key={tool.id}>
                <article className="h-full bg-white rounded-xl border border-line shadow-card p-5 flex flex-col">
                  <div className="flex items-start gap-3">
                    <span className="w-14 h-14 rounded-lg border border-line bg-[#ffffff] flex items-center justify-center shrink-0 overflow-hidden">
                      {tool.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tool.logoUrl} alt={`${tool.name} logo`} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <MonitorSmartphone size={24} aria-hidden="true" className="text-primary-800" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-lg text-primary-950 break-words">{tool.name}</h3>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                          {softwareCategoryLabel(tool.category)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            tool.isFree ? "bg-success-light text-success" : "bg-accent-100 text-primary-950"
                          }`}
                        >
                          {tool.isFree ? "Free / Open Source" : "Funded via Donations"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-[15px] text-ink leading-relaxed">{tool.description}</p>

                  {tool.platforms.length > 0 && (
                    <p className="mt-3 text-sm text-slate">
                      <span className="sr-only">Works on: </span>
                      {tool.platforms.map(softwarePlatformLabel).join(" · ")}
                    </p>
                  )}

                  <div className="mt-auto pt-4">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-primary-800 px-4 py-2.5 min-h-11 text-sm font-semibold text-white hover:bg-primary-900"
                      >
                        <SendHorizontal size={15} aria-hidden="true" /> Get via Telegram
                        <span className="sr-only"> — {tool.name} (opens Telegram in a new tab)</span>
                      </a>
                    ) : (
                      <p className="text-sm text-slate">Coming to the Telegram library soon.</p>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** "Can't find the software you need?" — straight to the technical team. */
export function SoftwareRequestForm({ defaults }: { defaults?: { fullName?: string; email?: string } }) {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await submitSoftwareRequestAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" key={resetKey}>
      {state.success ? (
        <FormAlert
          variant="success"
          message="Your request is with the technical team. We've emailed you a copy, and we'll write again with what we can do."
        />
      ) : (
        <FormAlert message={state.error} />
      )}
      <BotProtectionFields />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="request-name" required>
            Full name
          </Label>
          <input
            id="request-name"
            name="fullName"
            required
            autoComplete="name"
            maxLength={150}
            defaultValue={defaults?.fullName}
            className={inputClasses}
          />
          <FieldError messages={fe.fullName} />
        </div>
        <div>
          <Label htmlFor="request-email" required>
            Email address
          </Label>
          <input
            id="request-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            defaultValue={defaults?.email}
            className={inputClasses}
          />
          <FieldError messages={fe.email} />
        </div>
      </div>

      <div>
        <Label htmlFor="request-software" required>
          Software you need
        </Label>
        <input
          id="request-software"
          name="softwareName"
          required
          maxLength={150}
          className={inputClasses}
          placeholder="e.g. JAWS, ZoomText, Otter"
        />
        <FieldError messages={fe.softwareName} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="request-category" required>
            It helps with
          </Label>
          <select id="request-category" name="category" required defaultValue="" className={inputClasses}>
            <option value="" disabled>
              Choose one…
            </option>
            {SOFTWARE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError messages={fe.category} />
        </div>
        <div>
          <Label htmlFor="request-os" required>
            Your device runs
          </Label>
          <select id="request-os" name="operatingSystem" required defaultValue="" className={inputClasses}>
            <option value="" disabled>
              Choose one…
            </option>
            {REQUEST_OPERATING_SYSTEMS.map((os) => (
              <option key={os} value={os}>
                {os}
              </option>
            ))}
          </select>
          <FieldError messages={fe.operatingSystem} />
        </div>
      </div>

      <div>
        <Label htmlFor="request-notes">Anything else we should know</Label>
        <textarea
          id="request-notes"
          name="notes"
          rows={4}
          maxLength={2000}
          className={inputClasses}
          placeholder="Which version, what you'll use it for, or anything that makes setup harder."
        />
        <FieldError messages={fe.notes} />
      </div>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? <Loader2 size={17} aria-hidden="true" className="animate-spin" /> : <Send size={17} aria-hidden="true" />}
        {isPending ? "Sending…" : "Submit Request to Technical Team"}
      </Button>
    </form>
  );
}
