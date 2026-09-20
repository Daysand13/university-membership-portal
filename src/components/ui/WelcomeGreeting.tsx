"use client";

import { useEffect, useState } from "react";
import { Moon, Sunrise, Sun, Sunset } from "lucide-react";

/**
 * A greeting that knows the day and the hour on the reader's own clock.
 *
 * Rendered only after mounting, because the server has no idea what time
 * it is where the reader is — and a greeting that says "Good morning" to
 * someone at night is worse than no greeting. Until then the space stays
 * empty rather than flashing a guess, and the finished greeting is
 * announced politely, so a screen reader reaches it in its own time
 * instead of being interrupted.
 */

type Segment = "morning" | "afternoon" | "evening" | "night";

interface Greeting {
  segment: Segment;
  text: string;
}

const SEGMENTS: Record<Segment, { greeting: string; thanks: string }> = {
  morning: { greeting: "Good morning", thanks: "Thank you for joining us today." },
  afternoon: { greeting: "Good afternoon", thanks: "Thank you for joining us." },
  evening: { greeting: "Good evening", thanks: "Thank you for stopping by this evening." },
  night: { greeting: "Good night", thanks: "Thank you for passing through tonight." },
};

const ICONS: Record<Segment, typeof Sun> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
};

export function segmentForHour(hour: number): Segment {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** The whole greeting as one sentence — kept pure so it can be tested on any date. */
export function buildGreeting(now: Date, firstName?: string | null): Greeting {
  const segment = segmentForHour(now.getHours());
  const { greeting, thanks } = SEGMENTS[segment];
  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const midweek = now.getDay() === 3 ? " Happy mid-week!" : "";
  const who = firstName?.trim() ? `${greeting}, ${firstName.trim()}!` : `${greeting}!`;
  return { segment, text: `${who} It's ${day}, ${time}.${midweek} ${thanks}` };
}

export function WelcomeGreeting({
  firstName,
  className = "",
}: {
  /** The name of whoever is signed in; visitors are greeted without one. */
  firstName?: string | null;
  className?: string;
}) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);

  useEffect(() => {
    // On a tick of its own: the greeting is for after the page has
    // settled, and setting state straight from an effect body would
    // re-render everything above it a second time.
    const timer = window.setTimeout(() => setGreeting(buildGreeting(new Date(), firstName)), 0);
    return () => window.clearTimeout(timer);
  }, [firstName]);

  const Icon = greeting ? ICONS[greeting.segment] : Sun;

  // The live region is always in the page, empty and unstyled, so the
  // greeting lands in a region a screen reader is already watching — and
  // nothing shows before then, rather than an empty card flashing up.
  return (
    <div aria-live="polite" className={className}>
      {greeting && (
        <p className="flex items-center gap-2.5 text-[15px] sm:text-base font-medium leading-snug text-ink">
          <Icon size={18} aria-hidden="true" className="shrink-0 text-primary-800" />
          {greeting.text}
        </p>
      )}
    </div>
  );
}
