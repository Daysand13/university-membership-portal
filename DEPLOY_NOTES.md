# Deploying this update

No database changes this round — just code:

```bash
git add .
git commit -m "fix enrollment form reset bug, broaden mobile file picker, redirect after event save"
git push
```

## What was actually wrong (Issue 1)

Both symptoms you reported — "Confirm and Submit does nothing" and "going
back to edit wipes the form" — turned out to be **one root cause**, not two
separate bugs.

React automatically clears any form fields that aren't explicitly tied to
React's own state ("uncontrolled" fields) the moment a form action finishes
— including when it finishes with a validation error, not only on success.
The review screen sat on top of the real (hidden) form, so:

- If anything failed server-side (the only realistic case here is a
  duplicate index number, since everything else is checked before you even
  reach the review screen), the error message rendered *inside the hidden
  form* — invisible, hence "nothing happens."
- At the same moment, React silently wiped every field in that hidden form.
  So clicking "Edit Application" afterward showed a blank form — not
  because editing broke it, but because the failed submit attempt already
  cleared it a moment earlier.

**The fix**: every text/select/checkbox field is now backed by React state
directly (a "controlled" form), which is immune to that automatic clearing
— it only ever changes when the code explicitly changes it. On a
server-side error, the form now automatically comes back to the front (not
hidden) so the error is visible, and if file selections were affected,
there's now a clear on-screen notice asking the person to reselect their
passport picture and medical report before trying again — the one thing
that unfortunately cannot be preserved, since browsers never allow a file
input's value to be set or restored by JavaScript, for security reasons.

This is the standard, framework-recommended pattern (controlled inputs) for
any form that needs to reliably survive a failed submission — worth using
for the same reason on any other multi-step or review-before-submit form
added later.

## Issue 2 — mobile file picker

The medical report field's `accept` attribute was narrowly listing exact
image MIME types plus PDF only, which is part of why some Android browsers
were defaulting to camera-only. Two changes:

- Broadened to `accept="image/*,application/pdf,.pdf,application/msword,.doc,...,.docx"`
  — using the `image/*` wildcard (rather than listing `image/png`,
  `image/jpeg` individually) is what reliably gets Android to show its full
  chooser (Files, Drive, Gallery, Camera) instead of jumping straight to
  the camera.
- **Word documents (.doc/.docx) are now actually selectable** — the server
  already accepted them, but the form's `accept` attribute was silently
  filtering them out of the picker before they could even be chosen. Fixed.

Passport picture was similarly broadened to `accept="image/*"` for the same
Android-reliability reason.

## Issue 3 — admin event redirect

`updateEventAction` genuinely didn't redirect at all before — it returned
success silently and left the admin sitting on the same edit page.
`createEventAction` redirected to the newly-created event's own edit page
rather than the list. Both now redirect to `/admin/events` (the list) on
success, matching what you asked for.

## Best practices, since you asked

- **Form persistence across multi-step flows**: always use controlled
  inputs (React state, not `defaultValue`) for any form with a
  review/confirm step, or any form using `useActionState` where you want
  values to survive a failed submission. Uncontrolled fields are fine for
  simple one-shot forms with no review step.
- **Mobile file inputs**: prefer wildcard `accept` values (`image/*`) over
  listing exact MIME types when you want the broadest picker (Files,
  Gallery, Drive, Camera) rather than the narrowest one. Never set the
  `capture` attribute unless you specifically want to force the camera and
  skip the picker entirely.
- **Admin workflow UX**: after any create/update action that succeeds,
  redirect back to the relevant list view rather than leaving the admin on
  the form — it's the clearest signal that the action actually completed,
  and it matches what almost every admin panel does by convention.
