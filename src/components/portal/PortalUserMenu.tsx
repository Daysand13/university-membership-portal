"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, Settings } from "lucide-react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** The signed-in person's avatar and name, opening Account Settings / Change Password / Sign Out. */
export function PortalUserMenu({
  name,
  email,
  avatarUrl,
  settingsHref,
  passwordHref,
  signOutAction,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  settingsHref: string;
  passwordHref: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  const itemClasses =
    "flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 min-h-11 text-sm font-semibold text-primary-950 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <span className="w-9 h-9 rounded-full overflow-hidden bg-primary-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials(name)}</span>
          )}
        </span>
        <span className="hidden md:block max-w-[10rem] truncate text-sm font-semibold text-primary-950">{name}</span>
        <ChevronDown size={16} aria-hidden="true" className="text-slate" />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white shadow-card-hover p-2 z-50"
        >
          <div className="px-3 py-2 border-b border-line mb-1">
            <p className="text-sm font-semibold text-primary-950 truncate">{name}</p>
            <p className="text-xs text-slate truncate">{email}</p>
          </div>
          <Link href={settingsHref} onClick={() => setOpen(false)} className={itemClasses}>
            <Settings size={16} aria-hidden="true" /> Account Settings
          </Link>
          <Link href={passwordHref} onClick={() => setOpen(false)} className={itemClasses}>
            <KeyRound size={16} aria-hidden="true" /> Change Password
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={`${itemClasses} text-danger`}>
              <LogOut size={16} aria-hidden="true" /> Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
