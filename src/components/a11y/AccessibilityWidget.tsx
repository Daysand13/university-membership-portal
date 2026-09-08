"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Contrast, Volume2, VolumeX } from "lucide-react";

const CONTRAST_MODES = [
  { key: "", label: "Contrast: Default" },
  { key: "dark", label: "Contrast: Dark High-Contrast" },
  { key: "light-boost", label: "Contrast: Light High-Contrast" },
  { key: "grayscale", label: "Contrast: Grayscale" },
] as const;

const CONTRAST_STORAGE_KEY = "a11y-contrast-mode";

// The public header renders an empty slot with this id right next to its
// mobile hamburger button (see MobileNav) — portalling the compact buttons
// in there keeps them correctly aligned with it no matter how tall the
// header gets (the site title can wrap to several lines). Pages without
// that slot (admin, auth screens) fall back to a fixed top-right position.
const MOBILE_SLOT_ID = "a11y-mobile-slot";

const BUTTON_CLASSES =
  "flex items-center gap-2 rounded-full bg-primary-900 text-white shadow-lg hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

/**
 * Site-wide accessibility toolbar: a "Read Aloud" button that speaks the
 * current page's content via the browser's speech synthesis, and a
 * "Contrast" button that cycles through several high-contrast display
 * modes. Mounted once in the root layout so both work on every page.
 */
export function AccessibilityWidget() {
  const pathname = usePathname();
  const [contrastIndex, setContrastIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [mobileSlot, setMobileSlot] = useState<HTMLElement | null>(null);
  const hydrated = useRef(false);

  // Restore the saved contrast mode after mount (a plain page load starts
  // fresh, client-side navigations within the app keep this component
  // mounted and don't need it, but reading localStorage is cheap either way).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTRAST_STORAGE_KEY) ?? "";
      const idx = CONTRAST_MODES.findIndex((m) => m.key === stored);
      // One-time localStorage hydration after mount; reading it during
      // render would mismatch the server-rendered default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (idx > 0) setContrastIndex(idx);
    } catch {
      // localStorage unavailable (private browsing, etc.) — default mode is fine.
    }
    hydrated.current = true;
    // The slot lives in server-rendered header markup that's already in the
    // DOM by the time this client component mounts.
    setMobileSlot(document.getElementById(MOBILE_SLOT_ID));
  }, []);

  useEffect(() => {
    const mode = CONTRAST_MODES[contrastIndex];
    if (mode.key) {
      document.documentElement.setAttribute("data-contrast", mode.key);
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
    if (hydrated.current) {
      try {
        localStorage.setItem(CONTRAST_STORAGE_KEY, mode.key);
      } catch {
        // Ignore — the mode still applies for this page view.
      }
    }
  }, [contrastIndex]);

  // Stop reading whenever the route changes, so speech never carries on
  // top of a page the visitor already navigated away from. Also re-check
  // for the mobile slot, since it only exists on pages using the public
  // header and navigation can move between those and pages that don't.
  useEffect(() => {
    // Synchronizing with the route change itself (an external event), not
    // derived from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReading(false);
    setMobileSlot(document.getElementById(MOBILE_SLOT_ID));
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [pathname]);

  const toggleContrast = useCallback(() => {
    setContrastIndex((i) => (i + 1) % CONTRAST_MODES.length);
  }, []);

  const toggleReadAloud = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const root = document.querySelector("main") ?? document.body;
    const text = root.textContent?.trim() ?? "";
    if (!text) return;

    window.speechSynthesis.cancel();
    // Some browsers silently cut off a single very long utterance, so a
    // full page is read in sentence-sized chunks spoken back to back.
    const chunks = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
    let index = 0;
    const speakNext = () => {
      if (index >= chunks.length) {
        setIsReading(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      index++;
      utterance.onend = speakNext;
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
    };
    setIsReading(true);
    speakNext();
  }, [isReading]);

  const readAloudLabel = isReading ? "Stop reading page aloud" : "Read this page aloud";
  const contrastLabel = `Change contrast mode — currently ${CONTRAST_MODES[contrastIndex].label.replace("Contrast: ", "")}`;

  const compactButtons = (
    <>
      <button
        type="button"
        onClick={toggleReadAloud}
        aria-pressed={isReading}
        aria-label={readAloudLabel}
        className={`${BUTTON_CLASSES} p-2`}
      >
        {isReading ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <button type="button" onClick={toggleContrast} aria-label={contrastLabel} className={`${BUTTON_CLASSES} p-2`}>
        <Contrast size={17} />
      </button>
    </>
  );

  const labeledButtons = (
    <>
      <button
        type="button"
        onClick={toggleReadAloud}
        aria-pressed={isReading}
        aria-label={readAloudLabel}
        className={`${BUTTON_CLASSES} pl-3.5 pr-4 py-2.5 text-sm font-semibold`}
      >
        {isReading ? <VolumeX size={18} /> : <Volume2 size={18} />}
        {isReading ? "Stop Reading" : "Read Aloud"}
      </button>
      <button
        type="button"
        onClick={toggleContrast}
        aria-label={contrastLabel}
        className={`${BUTTON_CLASSES} pl-3.5 pr-4 py-2.5 text-sm font-semibold`}
      >
        <Contrast size={18} />
        {CONTRAST_MODES[contrastIndex].label}
      </button>
    </>
  );

  return (
    <>
      {mobileSlot
        ? createPortal(<div className="flex items-center gap-1.5 lg:hidden">{compactButtons}</div>, mobileSlot)
        : (
            <div className="fixed z-[9999] flex items-center gap-1.5 top-3 right-16 lg:hidden print:hidden">
              {compactButtons}
            </div>
          )}
      <div className="hidden lg:flex fixed z-[9999] flex-col items-end gap-2 right-5 bottom-5 print:hidden">
        {labeledButtons}
      </div>
    </>
  );
}
