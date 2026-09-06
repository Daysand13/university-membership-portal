"use client";

import { useState } from "react";
import { HONEYPOT_FIELD_NAME, TIMING_FIELD_NAME } from "@/lib/bot-protection";

/**
 * Drop this inside any public <form>. Invisible to every real visitor —
 * hidden visually via CSS and hidden from assistive technology via
 * aria-hidden + tabIndex={-1} + autoComplete="off", so it's never
 * announced by a screen reader and never reachable by keyboard
 * navigation. See lib/bot-protection.ts for how the two fields are used.
 */
export function BotProtectionFields() {
  const [renderedAt] = useState(() => Date.now().toString());

  return (
    <>
      <input type="hidden" name={TIMING_FIELD_NAME} value={renderedAt} />
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <label htmlFor={HONEYPOT_FIELD_NAME}>Leave this field blank</label>
        <input
          type="text"
          id={HONEYPOT_FIELD_NAME}
          name={HONEYPOT_FIELD_NAME}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
    </>
  );
}
