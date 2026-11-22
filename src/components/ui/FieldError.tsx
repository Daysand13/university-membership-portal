"use client";

import { useEffect, useId, useRef } from "react";
import { claimJustSubmitted } from "@/lib/client/form-safety";

/**
 * A field's error message, tied to the field it is about.
 *
 * Seeing a red line under a box is enough for somebody who can see it. A
 * screen reader user tabbing back to the box needs the box itself to say
 * it is wrong and why, so while the message shows, this:
 *
 *  - marks the field aria-invalid, so it is read as "invalid entry";
 *  - adds the message to the field's aria-describedby, so it is read
 *    straight after the field's name;
 *  - after a submit that failed, moves focus to the first field in the form
 *    with a problem, so nobody has to hunt for it.
 *
 * It finds the field without being told: the closest form control before
 * the message, in its own wrapper (the pattern every form here follows —
 * label, control, error). Pass `for` with the control's id where that
 * isn't the case. Everything it changes, it puts back when the message
 * goes away.
 */

const CONTROLS =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea, [role="combobox"], [contenteditable="true"]';

function findControl(error: HTMLElement, forId?: string): HTMLElement | null {
  if (forId) return document.getElementById(forId);
  let scope: HTMLElement | null = error.parentElement;
  for (let depth = 0; scope && depth < 3; depth += 1, scope = scope.parentElement) {
    const before = Array.from(scope.querySelectorAll<HTMLElement>(CONTROLS)).filter(
      (control) => control.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    if (before.length === 0) continue;
    // Where a label in this wrapper names a control, that is the one.
    const label = scope.querySelector<HTMLLabelElement>("label[for]");
    const named = label ? document.getElementById(label.htmlFor) : null;
    if (named && before.includes(named)) return named;
    return before[before.length - 1];
  }
  return null;
}

/** Radio buttons and checkboxes share one message, on their group. */
function describedElement(control: HTMLElement): HTMLElement {
  if (control instanceof HTMLInputElement && (control.type === "radio" || control.type === "checkbox")) {
    return control.closest<HTMLElement>('fieldset, [role="radiogroup"], [role="group"]') ?? control;
  }
  return control;
}

export function FieldError({ messages, for: forId }: { messages?: string[]; for?: string }) {
  const autoId = useId();
  const id = `field-error${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = useRef<HTMLParagraphElement>(null);
  const message = messages?.[0];

  useEffect(() => {
    const error = ref.current;
    if (!message || !error) return;
    const control = findControl(error, forId);
    if (!control) return;

    const target = describedElement(control);
    const previousInvalid = control.getAttribute("aria-invalid");
    const described = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    if (!described.includes(id)) target.setAttribute("aria-describedby", [...described, id].join(" "));
    if (target === control) control.setAttribute("aria-invalid", "true");

    // The first problem in the form takes focus — but only as the answer to
    // a submit. A page that loads with an error showing leaves focus where
    // the reader is.
    const form = error.closest("form");
    if (form && form.querySelector("[data-field-error]") === error && claimJustSubmitted(form)) {
      control.focus();
    }

    return () => {
      const remaining = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((t) => t && t !== id);
      if (remaining.length) target.setAttribute("aria-describedby", remaining.join(" "));
      else target.removeAttribute("aria-describedby");
      if (target === control) {
        if (previousInvalid === null) control.removeAttribute("aria-invalid");
        else control.setAttribute("aria-invalid", previousInvalid);
      }
    };
  }, [message, id, forId]);

  if (!message) return null;
  return (
    <p ref={ref} id={id} data-field-error="" className="mt-1 text-sm text-danger">
      <span className="sr-only">Error: </span>
      {message}
    </p>
  );
}
