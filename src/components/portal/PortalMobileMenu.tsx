"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, X } from "lucide-react";
import { PortalNav } from "./PortalNav";
import type { PortalNavItem } from "./portal-nav-items";

/**
 * The portal sidebar on phones: a menu button that opens the same navigation
 * as a panel over the page. Closes on navigation, on Escape and on the
 * backdrop; moves focus into the panel when it opens and back to the button
 * when it closes, so keyboard and screen-reader users aren't left stranded.
 */
export function PortalMobileMenu({ items, portalLabel }: { items: PortalNavItem[]; portalLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Close when the route changes — derived from the pathname during render
  // (React's pattern for resetting state on a prop change), not an effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) buttonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close portal menu" : "Open portal menu"}
        aria-expanded={open}
        aria-controls="portal-mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="p-2.5 -ml-2 rounded-md text-primary-950 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <Menu size={24} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close portal menu"
            className="absolute inset-0 bg-primary-950/60"
            onClick={() => setOpen(false)}
          />
          <div
            id="portal-mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${portalLabel} menu`}
            className="relative h-full w-[86%] max-w-xs bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="font-display font-bold text-base text-primary-950">{portalLabel}</span>
              <button
                type="button"
                aria-label="Close portal menu"
                onClick={() => setOpen(false)}
                className="p-2.5 -mr-2 rounded-md text-primary-950 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <PortalNav items={items} label={`${portalLabel} navigation`} />
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-800 hover:text-accent-600 py-2"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back to the main website
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
