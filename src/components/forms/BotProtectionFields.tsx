"use client";

import { useEffect, useRef } from "react";
import { FILL_TIME_FIELD_NAME, HONEYPOT_FIELD_NAME } from "@/lib/bot-protection";

/**
 * Drop this inside any public <form>. Invisible to every real visitor —
 * hidden visually via CSS and from assistive technology via aria-hidden and
 * tabIndex={-1}. See lib/bot-protection.ts for how the fields are judged.
 *
 * The fill time is added as the form is sent (the `formdata` event fires
 * whenever the browser collects a form's fields, which is how React reads a
 * form for its action too) and is measured with performance.now(): a
 * monotonic clock local to this page, so a phone set to the wrong time
 * can't make a person look like a script.
 */
export function BotProtectionFields() {
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = honeypotRef.current?.form;
    if (!form) return;
    const startedAt = performance.now();
    const addFillTime = (event: FormDataEvent) => {
      event.formData.set(FILL_TIME_FIELD_NAME, String(Math.round(performance.now() - startedAt)));
    };
    form.addEventListener("formdata", addFillTime);
    return () => form.removeEventListener("formdata", addFillTime);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
    >
      <label htmlFor={HONEYPOT_FIELD_NAME}>Leave this field blank</label>
      <input
        ref={honeypotRef}
        type="text"
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        tabIndex={-1}
        defaultValue=""
        // Chrome ignores autocomplete="off" for autofill; a token it doesn't
        // recognise is left alone. The data attributes opt this field out of
        // 1Password, LastPass, Bitwarden and Dashlane respectively.
        autoComplete="hp-leave-blank"
        data-1p-ignore=""
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
      />
    </div>
  );
}
