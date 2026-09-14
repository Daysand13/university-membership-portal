/**
 * Fully invisible bot detection for public forms — no challenge, no
 * interaction, nothing a real visitor (using assistive technology or not)
 * would ever notice or need to act on. Deliberately avoids CAPTCHAs of any
 * kind: even "invisible" behavioral ones can misfire on people using
 * screen readers or switch-access devices, whose interaction patterns
 * (no mouse movement, different timing) can look bot-like to those
 * systems.
 *
 * Two independent signals, either of which flags a submission:
 *
 * 1. Honeypot field — hidden from sighted users via CSS and from assistive
 *    technology via aria-hidden + tabIndex, so no real visitor ever sees or
 *    fills it in. Simple bots that fill in every field trip it.
 *
 * 2. Fill time — how long the page was open before the form was sent,
 *    measured entirely on the visitor's own device (see
 *    BotProtectionFields). A submission within a second and a half of the
 *    page loading is a script, not a person.
 *
 * Both used to misfire on real people, silently, and the enrollment form
 * answers a flagged submission with its normal success page — so a real
 * applicant saw "Application Submitted" while nothing was saved:
 *
 * - The timing field held the phone's clock at page load and was compared
 *   against the SERVER's clock. A phone whose clock ran fast by more than
 *   the time spent filling the form looked like an instant submission. Many
 *   phones' clocks are minutes out. Now the elapsed time is computed on the
 *   device, from one monotonic clock, so a wrong clock cancels out.
 * - The honeypot was named "website" with autocomplete="off". Chrome on
 *   Android ignores autocomplete="off" for autofill, and password managers
 *   fill hidden fields too. It now has a name no autofill heuristic
 *   recognises, an autocomplete token browsers don't act on, and the
 *   opt-out attributes the common password managers honour.
 *
 * Anything missing (an old tab, a browser without the formdata event)
 * counts as human: a false positive here loses a real person's submission
 * without a trace, which is far worse than letting one script through to
 * the checks that follow it.
 */

export const HONEYPOT_FIELD_NAME = "hp_leave_this_blank";
export const FILL_TIME_FIELD_NAME = "fillMs";

/** Faster than any person can fill in and send a form. */
export const MIN_HUMAN_FILL_MS = 1500;

export type BotSignal = "honeypot" | "too-fast";

export function detectBot(formData: FormData): BotSignal | null {
  const honeypot = formData.get(HONEYPOT_FIELD_NAME);
  if (typeof honeypot === "string" && honeypot.trim().length > 0) return "honeypot";

  const fillMs = Number(formData.get(FILL_TIME_FIELD_NAME));
  if (formData.has(FILL_TIME_FIELD_NAME) && Number.isFinite(fillMs) && fillMs >= 0 && fillMs < MIN_HUMAN_FILL_MS) {
    return "too-fast";
  }

  return null;
}

export function isLikelyBot(formData: FormData): boolean {
  return detectBot(formData) !== null;
}
