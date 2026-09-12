"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, GraduationCap, ShieldCheck } from "lucide-react";
import { PORTAL_HOME, PORTAL_LABEL, type PortalMode } from "./portal-nav-items";

/**
 * "Viewing as: Student Portal ▾" — the control a dual-status person uses to
 * move between their student and alumni sides without signing out.
 *
 * Someone with only one standing has nothing to switch to, so they just see
 * which portal they're in.
 *
 * `canSwitch` is whether the OTHER portal will actually open with the
 * current sign-in. A person who signed in through the older student-only or
 * alumni-only login has a session for one side only; for them the other
 * option leads to the unified sign-in (which covers both) instead of
 * dead-ending on a login screen they didn't expect.
 */
export function PortalSwitcher({
  current,
  isDual,
  canSwitch,
  isAdmin,
}: {
  current: PortalMode;
  isDual: boolean;
  canSwitch: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const CurrentIcon = current === "member" ? BookOpen : GraduationCap;

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

  if (!isDual) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-muted px-3.5 py-2 text-sm font-semibold text-primary-950">
        <CurrentIcon size={16} aria-hidden="true" />
        {PORTAL_LABEL[current]}
      </span>
    );
  }

  const other: PortalMode = current === "member" ? "alumni" : "member";
  const options: { mode: PortalMode; description: string }[] = [
    { mode: "member", description: "Current studies, dues and elections" },
    { mode: "alumni", description: "Directory, mentorship and career updates" },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-primary-800 px-3.5 py-2 min-h-11 text-sm text-primary-950 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <CurrentIcon size={16} aria-hidden="true" />
        <span>
          Viewing as: <strong className="font-semibold">{PORTAL_LABEL[current]}</strong>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white shadow-card-hover p-2 z-50"
        >
          <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate">Switch portal</p>
          <ul>
            {options.map(({ mode, description }) => {
              const isCurrent = mode === current;
              const Icon = mode === "member" ? BookOpen : GraduationCap;
              const href = isCurrent || canSwitch ? PORTAL_HOME[mode] : "/login";
              return (
                <li key={mode}>
                  <Link
                    href={href}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                  >
                    <Icon size={18} aria-hidden="true" className="mt-0.5 text-primary-800 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-primary-950">{PORTAL_LABEL[mode]}</span>
                      <span className="block text-xs text-slate">{description}</span>
                    </span>
                    {isCurrent && <Check size={16} aria-label="Current portal" className="mt-0.5 text-success shrink-0" />}
                  </Link>
                </li>
              );
            })}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
                >
                  <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 text-primary-800 shrink-0" />
                  <span className="block text-sm font-semibold text-primary-950">Admin Dashboard</span>
                </Link>
              </li>
            )}
          </ul>
          {!canSwitch && (
            <p className="px-3 pt-2 pb-1 text-xs text-slate leading-relaxed border-t border-line mt-1">
              To open the {PORTAL_LABEL[other]}, sign in once with your email address or index number — you can then
              move between both portals freely.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
