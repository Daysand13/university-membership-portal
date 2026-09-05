# Deploying this update

No database schema changes this round, but the database *connection*
itself changed, plus new dependencies — so this deploy needs a bit more
care than usual:

```bash
npm install
git add .
git commit -m "fix server errors (Neon connection pooling), Android document upload, category/label/wording fixes"
git push
```

**No `npx prisma migrate dev` needed this round** — nothing about the
database structure changed, only how the app connects to it.

## Issue 2 — the server errors (read this one)

**Root cause found and fixed.** The app was using a plain TCP connection
pool to talk to Postgres. On Vercel, under real concurrent traffic, many
separate serverless function instances can be running at once, and each
one was opening its own real connection to your Neon database. Neon has a
limited number of connections available — once that limit is hit, whoever's
request lands on the unlucky instance gets a server error, while everyone
else is unaffected. That's exactly the "some users can't access the site"
pattern you described.

**The fix**: switched to Neon's own serverless driver, which is built
specifically for this (many short-lived function instances) and is the
officially recommended setup for Vercel + Neon + Prisma. It's used
automatically in production (detected from your Neon connection string) —
local development is unaffected and still works exactly as before.

Along the way, I also found and fixed a second, related risk: a version
mismatch between Prisma's core package and its database-adapter package
that had crept in, which was silently breaking some error handling. All
Prisma-related packages are now pinned to identical exact versions so this
can't happen again on a future `npm install`.

**This is the most important part of this update** — if the site was
genuinely going down for some users before, this is very likely why.

## Issue 1 — Android file upload, second attempt

The first fix (broadening the file type list) turned out to be
insufficient — Android's "Photo Picker" mode restricts the chooser to
Camera/Gallery only whenever an image type appears anywhere in a file
input's accepted types, even mixed with PDF/Word types, on many real
device/browser versions.

**The real fix**: Medical Report is now two separate upload fields —
"Option A: Photo of the document" and "Option B: PDF or Word file" — so
neither one ever mixes image and document types. This reliably avoids the
restrictive picker on every Android version, since the ambiguity that
triggers it is gone entirely. The applicant just fills in whichever one
matches what they have.

## Issues 3, 4, 6 — quick fixes

- "Hearing Impairment" renamed to "Deaf" in the Category of Special Needs
  list. "Deafblindness" is unchanged, still in the list.
- "Emergency Contact" relabeled to "Emergency Contact Name" on the two
  admin detail pages (the form itself already said this correctly — only
  the admin view had the old label).
- Hall of Affiliation's placeholder now just says "Select…" instead of
  "Select (optional)".

## Issue 5 — shortened department & program names

Applied consistently across all four lists (undergraduate departments,
undergraduate programs, postgraduate departments, postgraduate programs):
the "Department of", "Bachelor of X (B.X.)", "Master of X (M.X.)", "Ph.D.",
"Diploma in", and similar prefixes are stripped, leaving just the subject —
e.g. "Department of Accounting" → "Accounting", "Bachelor of Education
(B.Ed.) Special Education" → "Special Education".

**One judgment call worth knowing about**: on the postgraduate side,
several different degree levels of the same subject existed as separate
entries purely because of their prefix — e.g. "M.Ed. Basic Education",
"M.Phil. Basic Education", and "Ph.D. Basic Education" were three different
list entries. Stripping the prefix would have made all three show up as
identical-looking "Basic Education" options in the same dropdown, which
would look like a bug and could confuse applicants. Since the separate
"Postgraduate Degree Category" field already captures which degree level
someone is applying for, I removed these exact duplicates rather than
leaving confusing repeats — 44 entries across the postgraduate program list
were consolidated this way. The Postgraduate Degree Category dropdown
itself was **not** shortened — it's a real degree-type selector where the
full name (e.g. "Master of Philosophy (M.Phil.)") is exactly what should
show.

Existing submitted applications and members are completely unaffected —
this only changes what shows in the dropdowns and what new submissions
store going forward.
