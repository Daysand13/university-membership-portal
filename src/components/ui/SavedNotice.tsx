"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { hasJustSaved, type ActionState } from "@/lib/actions/types";
import { showToast } from "@/components/ui/Toast";

/**
 * What a form says after it has been submitted.
 *
 * Inline beside the button, where someone who just clicked is looking, and
 * as a toast, which is where the eye goes on a long form whose button has
 * scrolled away. The action decides the wording: an action that also sent
 * an email says so, because "Saved" alone leaves someone wondering whether
 * anybody was told.
 */
export function SavedNotice({
  state,
  isPending,
  children = "Saved.",
  onSaved,
}: {
  state: ActionState;
  isPending: boolean;
  children?: ReactNode;
  /** Run once per successful submission — closing a panel, resetting a form. */
  onSaved?: () => void;
}) {
  const saved = hasJustSaved(state, isPending);
  // Identity, not value: two saves in a row produce two distinct state
  // objects, so this fires for each one, and re-renders in between fire
  // nothing.
  const announced = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!saved || announced.current === state) return;
    announced.current = state;
    showToast({ text: state.message ?? textOf(children) ?? "Saved." });
    onSaved?.();
  }, [saved, state, children, onSaved]);

  const failed = Boolean(state.error) && !isPending;
  const reported = useRef<ActionState | null>(null);
  useEffect(() => {
    if (!failed || reported.current === state) return;
    reported.current = state;
    showToast({ text: state.error!, variant: "error" });
  }, [failed, state]);

  if (!saved) return null;
  return (
    <p role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
      <CheckCircle2 size={16} aria-hidden="true" /> {state.message ?? children}
    </p>
  );
}

/**
 * The same confirmations, for a form that closes itself on success — its
 * SavedNotice would be unmounted before it could say anything, so the
 * component that stays behind raises the toast instead.
 */
export function useActionToast(state: ActionState, isPending: boolean, fallback = "Saved.") {
  const handled = useRef<ActionState | null>(null);
  useEffect(() => {
    if (isPending || handled.current === state) return;
    handled.current = state;
    if (state.error) showToast({ text: state.error, variant: "error" });
    else if (state.success || state.message) showToast({ text: state.message ?? fallback });
  }, [state, isPending, fallback]);
}

/** The toast needs a string; anything more elaborate than text falls back to a plain confirmation. */
function textOf(children: ReactNode): string | null {
  return typeof children === "string" ? children : null;
}
