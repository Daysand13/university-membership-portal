"use client";

import { useEffect } from "react";
import { clearDraft } from "@/lib/client/form-draft";

/**
 * Drops a saved form draft once its form has actually been submitted.
 *
 * Rendered on the confirmation page rather than in the form itself: a
 * successful submission redirects away, so the form never gets a "that
 * worked" render to clean up in. Reaching this page is the proof.
 */
export function ClearFormDraft({ draftKeys }: { draftKeys: string[] }) {
  useEffect(() => {
    for (const key of draftKeys) clearDraft(key);
    // draftKeys is a literal at every call site; joining keeps a new array
    // identity each render from re-running this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKeys.join("|")]);

  return null;
}
