/**
 * Fully invisible bot detection for public forms — no challenge, no
 * interaction, nothing a real visitor (using assistive technology or not)
 * would ever notice or need to act on. Deliberately avoids CAPTCHAs of any
 * kind: even "invisible" behavioral ones can misfire on people using
 * screen readers or switch-access devices, whose interaction patterns
 * (no mouse movement, different timing) can look bot-like to those
 * systems. This works differently — see below — so it never penalizes a
 * real person for how they use the site.
 *
 * Two independent signals, either of which flags a submission as
 * automated:
 *
 * 1. Honeypot field — a form field that's hidden from sighted users via
 *    CSS and hidden from assistive technology via aria-hidden + tabIndex,
 *    so no real visitor of any kind ever sees or fills it in. Simple bots
 *    that fill in every field on a page trip this immediately.
 *
 * 2. Submission timing — a hidden field records when the form was
 *    rendered; if the submission arrives less than a couple of seconds
 *    later, it's essentially certain to be a script submitting instantly
 *    rather than a person reading and filling in a form.
 */

export const HONEYPOT_FIELD_NAME = "website";
export const TIMING_FIELD_NAME = "renderedAt";
const MIN_HUMAN_SUBMIT_MS = 2000;

export function isLikelyBot(formData: FormData): boolean {
  const honeypot = formData.get(HONEYPOT_FIELD_NAME);
  if (typeof honeypot === "string" && honeypot.trim().length > 0) return true;

  const renderedAt = formData.get(TIMING_FIELD_NAME);
  if (typeof renderedAt === "string") {
    const renderedAtMs = Number(renderedAt);
    if (Number.isFinite(renderedAtMs) && Date.now() - renderedAtMs < MIN_HUMAN_SUBMIT_MS) {
      return true;
    }
  }

  return false;
}
