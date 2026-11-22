"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Narrowing a list to one or more special needs categories.
 *
 * Tick boxes in a disclosure rather than a multi-select: a `<select
 * multiple>` needs Ctrl-click with a mouse, is a scrolling box nobody
 * recognises on a phone, and announces itself in ways that confuse more
 * than they help. A `<details>` is a button a screen reader already knows
 * ("collapsed", "expanded"), and each category inside it is an ordinary tick
 * box with its own name — and it all works with no script at all.
 *
 * Every box is named `category`, so the GET form sends one per tick and the
 * address bar holds the whole choice, ready to share or to export.
 */
export function CategoryFilter({
  idPrefix,
  options,
  chosen,
}: {
  idPrefix: string;
  options: string[];
  chosen: string[];
}) {
  const [ticked, setTicked] = useState<string[]>(chosen);
  const summary =
    ticked.length === 0 ? "All categories" : ticked.length === 1 ? ticked[0] : `${ticked.length} categories chosen`;

  return (
    <div className="sm:col-span-2 lg:col-span-2">
      <p id={`${idPrefix}-category-label`} className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
        Special needs category
      </p>
      <details className="group rounded-md border border-line bg-white">
        <summary
          aria-describedby={`${idPrefix}-category-label`}
          className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm text-ink rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 [&::-webkit-details-marker]:hidden"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-slate transition-transform group-open:rotate-180" />
        </summary>
        <fieldset className="border-t border-line px-3 py-2">
          <legend className="sr-only">Special needs categories to include</legend>
          <p className="text-xs text-slate mb-1.5">Tick one or more. Members in any ticked category are shown.</p>
          <ul className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((category, i) => {
              const id = `${idPrefix}-category-${i}`;
              return (
                <li key={category}>
                  <label htmlFor={id} className="flex items-start gap-2.5 rounded px-1 py-1.5 text-sm text-ink cursor-pointer hover:bg-surface-muted">
                    <input
                      id={id}
                      type="checkbox"
                      name="category"
                      value={category}
                      checked={ticked.includes(category)}
                      onChange={(event) =>
                        setTicked((current) =>
                          event.target.checked ? [...current, category] : current.filter((c) => c !== category),
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-primary-800"
                    />
                    <span>{category}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {ticked.length > 0 && (
            <button
              type="button"
              onClick={() => setTicked([])}
              className="mt-1.5 text-xs font-semibold text-primary-800 hover:text-accent-600"
            >
              Untick all
            </button>
          )}
        </fieldset>
      </details>
    </div>
  );
}
