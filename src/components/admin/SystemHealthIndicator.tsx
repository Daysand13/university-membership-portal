"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CircleMinus } from "lucide-react";
import type { HealthCheck } from "@/lib/services/system-health-service";

const STATE_STYLES: Record<HealthCheck["state"], { dot: string; icon: typeof CircleCheck; text: string; word: string }> = {
  ok: { dot: "bg-success", icon: CircleCheck, text: "text-success", word: "Working" },
  warning: { dot: "bg-danger", icon: CircleAlert, text: "text-danger", word: "Needs attention" },
  off: { dot: "bg-warning", icon: CircleMinus, text: "text-warning", word: "Not set up" },
};

/**
 * The system health light in the admin header: one coloured dot, and a short
 * list of what it means on click. The dot never carries the meaning alone —
 * the button says it in words too, for anyone who can't tell the colours apart.
 */
export function SystemHealthIndicator({ checks, problems }: { checks: HealthCheck[]; problems: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const worst = checks.some((c) => c.state === "warning") ? "warning" : problems > 0 ? "off" : "ok";
  const summary = problems === 0 ? "All systems working" : `${problems} need${problems === 1 ? "s" : ""} attention`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2.5 py-2 min-h-11 text-xs font-semibold text-slate hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATE_STYLES[worst].dot}`} />
        <span className="hidden md:inline">{summary}</span>
        <span className="sr-only md:hidden">System status: {summary}</span>
      </button>

      {open && (
        <div
          id={panelId}
          // On a phone the button sits mid-header, so a panel hung off its
          // right edge would run off the left of the screen; there it spans
          // the width under the header instead.
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 rounded-lg border border-line bg-white shadow-lg p-4 z-40"
        >
          <p className="text-sm font-semibold text-primary-950 mb-3">System status</p>
          <ul className="space-y-3">
            {checks.map((check) => {
              const style = STATE_STYLES[check.state];
              const Icon = style.icon;
              return (
                <li key={check.key} className="flex gap-2.5">
                  <Icon size={17} aria-hidden="true" className={`shrink-0 mt-0.5 ${style.text}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-950">
                      {check.label} <span className={`font-normal ${style.text}`}>· {style.word}</span>
                    </p>
                    <p className="text-xs text-slate mt-0.5">{check.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
