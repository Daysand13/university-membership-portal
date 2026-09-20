"use client";

import { useActionState, useState } from "react";
import { Loader2, MonitorSmartphone, Play, PlaySquare, Send, SendHorizontal, SquareArrowOutUpRight } from "lucide-react";
import { submitTechRequestAction } from "@/lib/actions/public-outreach-actions";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import { BotProtectionFields } from "@/components/forms/BotProtectionFields";
import {
  REQUEST_OPERATING_SYSTEMS,
  SOFTWARE_CATEGORIES,
  TECH_FILTERS,
  TECH_REQUEST_KINDS,
  softwareCategoryLabel,
  softwarePlatformLabel,
  tutorialSourceLabel,
  youTubeEmbedUrl,
  youTubeThumbnail,
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

export interface DirectoryTutorial {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  videoId: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  durationLabel: string | null;
}

/**
 * Everything on the Tech & Tutorials page in one grid: the software in the
 * Telegram library, and the video walk-throughs on YouTube and TikTok.
 *
 * They share a grid because someone arriving with a problem doesn't know
 * yet whether the answer is a download or a five-minute video — the tabs
 * are there for when they do.
 */
export function TechDirectory({
  software,
  tutorials,
  libraryUrl,
}: {
  software: DirectorySoftware[];
  tutorials: DirectoryTutorial[];
  libraryUrl: string | null;
}) {
  const [filter, setFilter] = useState<string>("ALL");

  const shownSoftware = filter === "ALL" || filter === "SOFTWARE" ? software : [];
  const shownTutorials =
    filter === "ALL" ? tutorials : filter === "SOFTWARE" ? [] : tutorials.filter((t) => t.source === filter);
  const total = shownSoftware.length + shownTutorials.length;

  return (
    <div>
      <div role="group" aria-label="Filter what's shown" className="flex flex-wrap gap-2">
        {TECH_FILTERS.map((option) => (
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
        Showing {total} {total === 1 ? "item" : "items"}
      </p>

      {total === 0 ? (
        <p className="mt-8 text-slate">Nothing here yet. If you need something, ask for it below — software or a tutorial.</p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shownSoftware.map((tool) => (
            <li key={tool.id}>
              <SoftwareCard tool={tool} libraryUrl={libraryUrl} />
            </li>
          ))}
          {shownTutorials.map((tutorial) => (
            <li key={tutorial.id}>
              <TutorialCard tutorial={tutorial} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SoftwareCard({ tool, libraryUrl }: { tool: DirectorySoftware; libraryUrl: string | null }) {
  const href = tool.telegramUrl || libraryUrl;
  return (
    <article className="h-full bg-white rounded-xl border border-line shadow-card p-5 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="w-14 h-14 rounded-lg border border-line bg-white flex items-center justify-center shrink-0 overflow-hidden">
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
              Software
            </span>
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
  );
}

/**
 * A tutorial card. A YouTube video plays in place, but only once someone
 * presses play — until then nothing is requested from YouTube at all, so
 * the page stays fast and no one is tracked for scrolling past. TikTok has
 * no embed that behaves, so those open in the app or a new tab.
 */
function TutorialCard({ tutorial }: { tutorial: DirectoryTutorial }) {
  const [playing, setPlaying] = useState(false);
  const isYouTube = tutorial.source === "YOUTUBE";
  const still = tutorial.thumbnailUrl ?? (isYouTube && tutorial.videoId ? youTubeThumbnail(tutorial.videoId) : null);
  const canPlayInPlace = isYouTube && Boolean(tutorial.videoId);

  return (
    <article className="h-full bg-white rounded-xl border border-line shadow-card flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-primary-950">
        {playing && canPlayInPlace ? (
          <iframe
            src={youTubeEmbedUrl(tutorial.videoId!)}
            title={tutorial.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <>
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={still} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-primary-300">
                <PlaySquare size={40} aria-hidden="true" />
              </span>
            )}
            {canPlayInPlace ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-primary-950/40 hover:bg-primary-950/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <span className="w-14 h-14 rounded-full bg-white/95 text-primary-900 flex items-center justify-center shadow-lg">
                  <Play size={24} aria-hidden="true" className="ml-0.5" />
                </span>
                <span className="sr-only">Play the video: {tutorial.title}</span>
              </button>
            ) : (
              <a
                href={tutorial.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-primary-950/40 hover:bg-primary-950/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <span className="w-14 h-14 rounded-full bg-white/95 text-primary-900 flex items-center justify-center shadow-lg">
                  <Play size={24} aria-hidden="true" className="ml-0.5" />
                </span>
                <span className="sr-only">
                  Watch on {tutorialSourceLabel(tutorial.source)}: {tutorial.title} (opens in a new tab)
                </span>
              </a>
            )}
          </>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-primary-950">
            {tutorialSourceLabel(tutorial.source)}
          </span>
          {tutorial.category && (
            <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
              {softwareCategoryLabel(tutorial.category)}
            </span>
          )}
          {tutorial.durationLabel && (
            <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-slate">
              {tutorial.durationLabel}
            </span>
          )}
        </p>
        <h3 className="mt-2 font-display font-bold text-lg text-primary-950 break-words">{tutorial.title}</h3>
        <p className="mt-2 text-[15px] text-ink leading-relaxed flex-1">{tutorial.description}</p>

        <div className="mt-4">
          <a
            href={tutorial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 min-h-11 text-sm font-semibold text-primary-800 hover:bg-surface-muted hover:text-accent-600"
          >
            <SquareArrowOutUpRight size={15} aria-hidden="true" /> Watch on {tutorialSourceLabel(tutorial.source)}
            <span className="sr-only"> — {tutorial.title} (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * One form for both kinds of request. What you're asking for decides what
 * it asks you: software needs to know your operating system, a tutorial
 * doesn't.
 */
export function TechRequestForm({ defaults }: { defaults?: { fullName?: string; email?: string } }) {
  const [kind, setKind] = useState<string>("SOFTWARE");
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await submitTechRequestAction(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, initialActionState);
  const fe = state.fieldErrors ?? {};
  const isSoftware = kind === "SOFTWARE";

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

      <fieldset>
        <legend className="block text-sm font-medium text-primary-950 mb-1.5">What do you need?</legend>
        <div className="flex flex-wrap gap-3">
          {TECH_REQUEST_KINDS.map((option) => (
            <label
              key={option.value}
              className={`flex-1 min-w-[12rem] cursor-pointer rounded-lg border p-3.5 ${
                kind === option.value ? "border-primary-800 bg-primary-50" : "border-line bg-white hover:border-primary-400"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="h-4 w-4 border-line text-primary-800"
                />
                <span className="font-semibold text-primary-950">{option.label}</span>
              </span>
              <span className="mt-1 block text-xs text-slate pl-7">{option.hint}</span>
            </label>
          ))}
        </div>
        <FieldError messages={fe.kind} />
      </fieldset>

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
        <Label htmlFor="request-topic" required>
          {isSoftware ? "Software you need" : "What the tutorial should cover"}
        </Label>
        <input
          id="request-topic"
          name="topic"
          required
          maxLength={150}
          className={inputClasses}
          placeholder={isSoftware ? "e.g. JAWS, ZoomText, Otter" : "e.g. Reading a PDF with NVDA"}
        />
        <FieldError messages={fe.topic} />
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
        {isSoftware && (
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
        )}
      </div>

      <div>
        <Label htmlFor="request-notes">Anything else we should know</Label>
        <textarea
          id="request-notes"
          name="notes"
          rows={4}
          maxLength={2000}
          className={inputClasses}
          placeholder={
            isSoftware
              ? "Which version, what you'll use it for, or anything that makes setup harder."
              : "What you've already tried, and where you get stuck."
          }
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
