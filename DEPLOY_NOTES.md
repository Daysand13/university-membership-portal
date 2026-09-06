# Deploying this update

No database changes this round — just code:

```bash
git add .
git commit -m "fix server error on document upload, center success message on mobile"
git push
```

## Issue 1 — server error when choosing Option B (document)

**Root cause**: Next.js has its own built-in limit on how large a Server
Action's submission can be, separate from any limit your own code sets.
That platform default is smaller than this app's own stated upload limits
(2MB for the passport picture, 5MB for the medical report) — meaning a
file your own validation would happily accept could get rejected by the
platform itself before your code even had a chance to run, showing up as
a generic server error instead of the friendly "file too large" message
the form already has for that case.

This explains why it showed up specifically for **Option B** (PDF/Word
document) rather than Option A (photo): a scanned or exported document is
far more likely to land in that gap between the small platform default and
your form's stated 5MB limit than a compressed phone camera photo usually
is.

**Fix**: explicitly raised that platform limit in `next.config.ts` to
10MB, comfortably above both of your form's actual limits, so your own
2MB/5MB rules are what actually governs this going forward — not a hidden
default. Also added a safety net around both file-upload code paths
(passport picture and medical report) so that if anything else
unexpected ever goes wrong during an upload, the person sees a normal
"something went wrong, please try again" message instead of the harsh
generic server error page.

## Issue 2 — success message off-center on mobile

The confirmation page after submitting an application only had fixed
top/bottom spacing, not true vertical centering — on a tall phone screen
with relatively short confirmation text, that left it sitting noticeably
above center rather than in the middle of the screen. Fixed to genuinely
center both horizontally and vertically, matching the pattern already
used on the sign-in and password pages elsewhere in the app.
