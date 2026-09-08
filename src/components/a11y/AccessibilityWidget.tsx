"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";

const THEME_STORAGE_KEY = "a11y-theme";

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
 * Dark/Light mode toggle — same idea as a phone's system theme switch.
 * Written copy goes white on dark, dark on light; the gold accent palette
 * is untouched either way (see globals.css). Mounted once in the root
 * layout so both controls work on every page.
 */
export function AccessibilityWidget() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [mobileSlot, setMobileSlot] = useState<HTMLElement | null>(null);
  const hydrated = useRef(false);

  // Restore the saved theme after mount (a plain page load starts fresh;
  // client-side navigations keep this component mounted and don't need
  // this, but reading localStorage again is cheap either way).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      // One-time localStorage hydration after mount; reading it during
      // render would mismatch the server-rendered default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "dark") setIsDark(true);
    } catch {
      // localStorage unavailable (private browsing, etc.) — light mode is fine.
    }
    hydrated.current = true;
    // The slot lives in server-rendered header markup that's already in the
    // DOM by the time this client component mounts.
    setMobileSlot(document.getElementById(MOBILE_SLOT_ID));
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (hydrated.current) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      } catch {
        // Ignore — the theme still applies for this page view.
      }
    }
  }, [isDark]);

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

  const toggleTheme = useCallback(() => {
    setIsDark((d) => !d);
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
  const themeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

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
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={themeLabel}
        className={`${BUTTON_CLASSES} p-2`}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
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
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={themeLabel}
        className={`${BUTTON_CLASSES} pl-3.5 pr-4 py-2.5 text-sm font-semibold`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        {isDark ? "Light Mode" : "Dark Mode"}
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
