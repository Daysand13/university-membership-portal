"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ALargeSmall, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { DisplaySettingsPanel, isTextSize, type TextSize } from "./DisplaySettingsPanel";

const THEME_STORAGE_KEY = "a11y-theme";
const TEXT_SIZE_STORAGE_KEY = "a11y-text-size";
const CONTRAST_STORAGE_KEY = "a11y-contrast";

/**
 * What the pre-paint script in the root layout already applied to <html>.
 * Starting from it (rather than from a default and correcting after mount)
 * means a saved text size never jumps back to standard for a frame. Nothing
 * rendered depends on these until the panel is opened, so the server's
 * default can't cause a hydration mismatch.
 */
function readRootAttribute(name: string): string | null {
  return typeof document === "undefined" ? null : document.documentElement.getAttribute(name);
}

// Where the controls sit. Every header in the site renders one of these
// empty slots, so the controls are always at the top of the page:
//
//  - HEADER_SLOT_ID: beside the public site's menu button on phones and
//    tablets, and beside the account menu in the portals and admin at every
//    width. Round icon buttons.
//  - BAR_SLOT_ID: the dark strip across the very top of the public site, on
//    desktop. Small labelled buttons, like the strip's other links.
//
// A page with neither (the sign-in screens) gets the round buttons pinned
// to the top-right corner instead.
const HEADER_SLOT_ID = "a11y-mobile-slot";
const BAR_SLOT_ID = "a11y-desktop-slot";

/** Wide enough that the separate Dark Mode button is on screen. */
const DESKTOP_QUERY = "(min-width: 1024px)";

const ROUND_BUTTON =
  "flex items-center justify-center w-9 h-9 rounded-full bg-primary-900 text-white shadow-sm hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

const BAR_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 min-h-7 text-xs font-semibold text-primary-100 hover:text-accent-400 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400";

interface PanelPlacement {
  top: number;
  /** Distance from the right edge; null spans the screen (phones). */
  right: number | null;
  /** Carries dark mode too, where the separate button isn't shown. */
  withDark: boolean;
}

function placementFor(button: HTMLElement): PanelPlacement {
  const rect = button.getBoundingClientRect();
  // clientWidth, not innerWidth: a fixed element's `right` is measured from
  // the edge of the page, inside any scrollbar.
  const pageWidth = document.documentElement.clientWidth;
  const narrow = pageWidth < 640;
  return {
    top: Math.round(rect.bottom + 8),
    right: narrow ? null : Math.max(16, Math.round(pageWidth - rect.right)),
    withDark: !window.matchMedia(DESKTOP_QUERY).matches,
  };
}

/**
 * Site-wide accessibility toolbar: a "Read Aloud" button that speaks the
 * current page's content via the browser's speech synthesis, a Dark/Light
 * mode toggle — same idea as a phone's system theme switch — and a Display
 * panel for text size and high contrast. Written copy goes white on dark,
 * dark on light; the gold accent palette is untouched either way (see
 * globals.css). Mounted once in the root layout so every control works on
 * every page, always at the top of it.
 *
 * On phones the header only has room for two round buttons, so there the
 * Display panel also carries the dark mode switch.
 */
export function AccessibilityWidget() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [barSlot, setBarSlot] = useState<HTMLElement | null>(null);
  const hydrated = useRef(false);
  const [textSize, setTextSize] = useState<TextSize>(() => {
    const applied = readRootAttribute("data-text-size");
    return isTextSize(applied) ? applied : "standard";
  });
  const [highContrast, setHighContrast] = useState(() => readRootAttribute("data-contrast") === "high");
  const [displayOpen, setDisplayOpen] = useState(false);
  // Where the panel opens: just under whichever button opened it. Kept in
  // state because the header can grow a row when the text size goes up.
  const [placement, setPlacement] = useState<PanelPlacement>({ top: 64, right: 16, withDark: false });
  const displayPanelId = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    // The slots live in server-rendered header markup that's already in the
    // DOM by the time this client component mounts.
    setHeaderSlot(document.getElementById(HEADER_SLOT_ID));
    setBarSlot(document.getElementById(BAR_SLOT_ID));
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

  useEffect(() => {
    const root = document.documentElement;
    if (textSize === "standard") root.removeAttribute("data-text-size");
    else root.setAttribute("data-text-size", textSize);
    // A new size can change the header's height under an open panel; keep
    // the panel just below its button. Reading layout, not deriving from
    // state, so this belongs in the effect.
    const button = anchorRef.current;
    if (button && button.isConnected) {
      setPlacement(placementFor(button));
    }
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
    } catch {
      // Ignore — the size still applies for this page view.
    }
  }, [textSize]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.setAttribute("data-contrast", "high");
    else root.removeAttribute("data-contrast");
    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, highContrast ? "high" : "normal");
    } catch {
      // Ignore — contrast still applies for this page view.
    }
  }, [highContrast]);

  // The Display panel closes on a click anywhere else, or Escape.
  useEffect(() => {
    if (!displayOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      setDisplayOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDisplayOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [displayOpen]);

  // Stop reading whenever the route changes, so speech never carries on
  // top of a page the visitor already navigated away from. Also re-check
  // for the mobile slot, since it only exists on pages using the public
  // header and navigation can move between those and pages that don't.
  useEffect(() => {
    // Synchronizing with the route change itself (an external event), not
    // derived from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReading(false);
    setDisplayOpen(false);
    setHeaderSlot(document.getElementById(HEADER_SLOT_ID));
    setBarSlot(document.getElementById(BAR_SLOT_ID));
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

  const toggleDisplay = (event: React.MouseEvent<HTMLButtonElement>) => {
    anchorRef.current = event.currentTarget;
    setPlacement(placementFor(event.currentTarget));
    setDisplayOpen((open) => !open);
  };

  const displayButtonProps = {
    type: "button" as const,
    onClick: toggleDisplay,
    "aria-expanded": displayOpen,
    "aria-controls": displayPanelId,
  };

  // Round icon buttons, for the portal and admin headers, the public header
  // on smaller screens, and the fallback corner. The separate dark mode
  // button only appears from 1024px up; below that it's inside the panel.
  const roundButtons = (
    <>
      <button
        type="button"
        onClick={toggleReadAloud}
        aria-pressed={isReading}
        aria-label={readAloudLabel}
        title={readAloudLabel}
        className={ROUND_BUTTON}
      >
        {isReading ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={themeLabel}
        title={themeLabel}
        className={`${ROUND_BUTTON} hidden lg:flex`}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button
        {...displayButtonProps}
        aria-label="Display settings"
        title="Display settings: text size and contrast"
        className={ROUND_BUTTON}
      >
        <ALargeSmall size={17} />
      </button>
    </>
  );

  // Labelled buttons for the dark strip at the top of the public site.
  const barButtons = (
    <>
      <button type="button" onClick={toggleReadAloud} aria-pressed={isReading} aria-label={readAloudLabel} className={BAR_BUTTON}>
        {isReading ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
        {isReading ? "Stop Reading" : "Read Aloud"}
      </button>
      <button type="button" onClick={toggleTheme} aria-pressed={isDark} aria-label={themeLabel} className={BAR_BUTTON}>
        {isDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>
      <button {...displayButtonProps} className={BAR_BUTTON}>
        <ALargeSmall size={14} aria-hidden="true" />
        Text &amp; Contrast
      </button>
    </>
  );

  return (
    <>
      {headerSlot &&
        createPortal(<div className="flex items-center gap-1.5 print:hidden">{roundButtons}</div>, headerSlot)}
      {barSlot && createPortal(<div className="hidden lg:flex items-center gap-1 print:hidden">{barButtons}</div>, barSlot)}
      {!headerSlot && !barSlot && (
        <div className="fixed z-[9999] flex items-center gap-1.5 top-3 right-3 print:hidden">{roundButtons}</div>
      )}

      {/* Portalled to <body> so no header styling can trap or clip it. */}
      {displayOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={placement.right === null ? { top: placement.top } : { top: placement.top, right: placement.right }}
            className={`fixed z-[10000] max-h-[calc(100vh-6rem)] overflow-y-auto print:hidden ${
              placement.right === null ? "inset-x-4" : "w-72"
            }`}
          >
            <DisplaySettingsPanel
              id={displayPanelId}
              textSize={textSize}
              onTextSize={setTextSize}
              highContrast={highContrast}
              onHighContrast={setHighContrast}
              dark={placement.withDark ? { on: isDark, toggle: toggleTheme } : undefined}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
