# Deploying this update

No schema changes this round, but there IS a one-off data script to run.
Order matters:

```bash
git add .
git commit -m "audit + fix unhandled server action errors, abbreviate program/degree names + migrate existing data"
git push
```

Then, once deployed (or any time after — it's safe to run whenever, even
before deploying), run the data migration from your local machine (same
setup as running `npx prisma migrate dev` — it uses your local `.env`,
which already points at the live database):

```bash
npx tsx prisma/migrate-programme-abbreviations.ts
```

This updates existing applications/members' stored program and degree
values to the new abbreviated format (see Issue 2 below for why this is
needed). **It's safe to run more than once** — it only touches rows that
still have an old-format value, so running it twice does nothing the
second time. It prints a summary of how many rows it changed.

## Issue 1 — server errors, continued

Last round's fix (the database connection change) addressed one real
cause. This round I did the audit you asked for — went through every
server action in the app one by one, specifically looking for database
calls with no error handling around them, since an uncaught error in a
server action is exactly what produces the generic "server error, reload
to try again" page.

**Found and fixed five of them**, all in public-facing forms anyone could
trigger:
- The Contact form
- "Forgot password" for both student members and alumni
- Profile updates for both student members and alumni

Each now catches unexpected errors and shows a friendly message instead of
crashing the whole request. Two additional safety nets were added on top:

- A proper error page (`error.tsx` / `global-error.tsx`) now catches
  anything unexpected anywhere else in the app and shows a branded "Try
  Again" screen instead of the raw browser error interstitial.
- The two highest-traffic public submissions (membership enrollment and
  the contact form) now automatically retry once if the database call
  fails with what looks like a brief connection blip, rather than failing
  the person's submission outright.

## Issue 2 — abbreviations, and a data-consistency note worth reading

All program and degree names now use abbreviations consistently — e.g.
"Bachelor of Education (B.Ed.) Special Education" → "BEd Special
Education", "Master of Philosophy (M.Phil.)" → "MPhil". Applies to both
undergraduate and postgraduate lists, and to the Postgraduate Degree
Category selector itself.

**Why a migration script and not just new dropdown text**: your programme
field went through three different formats over the last few rounds — the
original full names, a briefly-shortened "bare subject name" version, and
now this abbreviated version. Existing applications and members are still
sitting in whichever format they were submitted in. The script maps all of
that to the new format in one pass.

**One thing worth knowing**: a couple of postgraduate program names
briefly existed in that "bare" middle format with the degree level
stripped out entirely (e.g. just "Basic Education" with no way to tell if
it was the M.Ed., M.Phil., or Ph.D. version from the text alone). The
script recovers the correct one using each row's own separately-stored
"Degree Category" field, which was never touched by that earlier
shortening — so this is fully accurate for postgraduate records. On the
undergraduate side there's no equivalent field, and exactly one program
name ("Early Childhood Education") has this same ambiguity between the
Bachelor's and Diploma versions; the script defaults these to the
Bachelor's version as the more common case. If you want to double-check
this didn't miscategorize anyone, the script prints out the specific
application/member IDs it had to make that judgment call for — search your
admin panel for those.

Alumni who self-registered (rather than being promoted from a student
member) are untouched by this script — their program name was always
free text they typed themselves, never one of these controlled options.
