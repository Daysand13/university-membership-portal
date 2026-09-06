# Deploying this update

No database changes — just code:

```bash
git add .
git commit -m "structural fix for server errors across all actions; single medical report upload field"
git push
```

## Item 1 — the server error, fixed structurally this time

I audited all 58 server actions in the app (every form submission, delete
button, status toggle, admin save) using a script rather than by eye, and
found **46 of them had at least one database call with no error handling
around it**. Any one of those failing — a brief connection blip, an
unexpected data state — produces exactly the "a server error occurred"
page you've been seeing.

Previous rounds fixed these one at a time as they surfaced. That approach
was never going to hold, because the next action anyone adds starts the
problem over again. So this round fixes it at the structural level
instead:

1. **Every action is now wrapped** at the point it's exported, so an
   unexpected failure becomes a friendly inline message ("Something went
   wrong. Please try again…") instead of the raw error page. Redirects and
   permission errors deliberately still pass through, since those are
   meaningful rather than bugs.
2. **A lint rule now enforces it.** Exporting a server action without the
   wrapper is a build error, with a message explaining what to do instead.
   I verified the rule actually fires by deliberately writing a
   non-compliant action and confirming the build rejected it. This is the
   part that makes it stay fixed after future updates — it's no longer
   dependent on anyone remembering.

Combined with the error boundary and connection-pooling fixes from
previous rounds, the raw "server error" page should now be genuinely
difficult to trigger.

## Item 2 — one upload field for the medical report

This is now a single field again, accepting photos, PDFs, and Word
documents together.

**Worth explaining, because my earlier diagnosis of this was wrong.** I
previously split it into two fields believing that mixing image and
document types was what triggered Android's restrictive photo picker. I
went and checked the actual Chromium bug report this time, and the
behaviour is the opposite of what I assumed:

- A file input accepting **only images** gets Android's simplified photo
  picker — camera and gallery only, no access to saved files. This is the
  restriction people were hitting.
- A file input accepting **mixed types** (images *and* documents) opens
  the **full system file browser** — which includes camera, gallery,
  Downloads, Drive, and everything else.

So the mixed accept list is not the problem; it's the solution, and it's
how other sites achieve this. The two-field split was solving a problem
that didn't exist, while the genuine cause of the "Option B" failure was
the upload size limit fixed in the last round.

The single field now uses the full mixed accept list, so on Android it
opens the complete file browser with every source available, and on iOS it
shows the usual Photo Library / Take Photo / Browse sheet. One field, no
choosing between options, everything reachable.
