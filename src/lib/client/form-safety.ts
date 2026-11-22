/**
 * Two things every form on the site needs, done once for all of them.
 *
 * 1. NOTHING TYPED IS LOST WHEN A FORM IS SENT BACK WITH A PROBLEM.
 *    React resets a form after its action finishes — every time, whether
 *    the action saved or said "that date isn't real". For somebody who
 *    typed a long answer slowly, by voice or with a switch, having it wiped
 *    because one box was wrong is the worst thing a form can do. React's
 *    reset goes through form.reset(), which fires a cancelable "reset"
 *    event after the new state (and its error messages) is already on the
 *    page. So: when the form is showing an error, the reset is cancelled
 *    and everything stays as typed. A form that saved has no error, and
 *    clears as it always did. A person pressing a real Reset button is
 *    never stopped: that is told apart by the click on the button, since
 *    a reset React starts with form.reset() looks just as "trusted".
 *
 * 2. WHICH FORM WAS JUST SENT. The send button is disabled while a form is
 *    sending, and a disabled button drops focus to the page — so afterwards
 *    nothing knows where the person was. FieldError asks here, to move
 *    focus to the first problem in the form they just sent.
 */

let lastSubmit: { form: HTMLFormElement; at: number } | null = null;
let resetPressed: { form: HTMLFormElement; at: number } | null = null;
let installed = false;

/** Errors this recent count as the answer to the submit. */
const ANSWER_WINDOW_MS = 30_000;

function showsAProblem(form: HTMLFormElement): boolean {
  return form.querySelector('[data-field-error], [role="alert"]') !== null;
}

export function installFormSafety(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  document.addEventListener(
    "submit",
    (event) => {
      if (event.target instanceof HTMLFormElement) lastSubmit = { form: event.target, at: Date.now() };
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target instanceof Element ? event.target.closest('[type="reset"]') : null;
      const form = button && "form" in button ? (button as HTMLButtonElement).form : null;
      if (form) resetPressed = { form, at: Date.now() };
    },
    true,
  );

  document.addEventListener(
    "reset",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const byPerson = resetPressed?.form === form && Date.now() - resetPressed.at < 1000;
      resetPressed = null;
      if (!byPerson && showsAProblem(form)) event.preventDefault();
    },
    true,
  );
}

/**
 * Whether `form` was sent a moment ago and its problems haven't been
 * pointed at yet. True once per submit, so focus moves once.
 */
export function claimJustSubmitted(form: HTMLFormElement | null): boolean {
  if (!form || !lastSubmit || lastSubmit.form !== form) return false;
  if (Date.now() - lastSubmit.at > ANSWER_WINDOW_MS) return false;
  lastSubmit = null;
  return true;
}
