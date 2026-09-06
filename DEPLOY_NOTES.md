# Deploying this update

**No database changes.** No migration to run.

```bash
git add .
git commit -m "fix enrollment reliability: fail-open rate limiter, isolate post-save work, cache+guard site settings; fix Samsung document picker"
git push
```

---

# INVESTIGATION REPORT

## Scope limits — read this first

Several things the brief asked for cannot be done from my environment, and
I'd rather say so than imply otherwise:

| Requested | Status |
|---|---|
| Verify production database / migration state | **Not done directly.** I have no production credentials (by design). See "Database" below for what I *can* evidence. |
| Test on Samsung / Tecno / iPhone / desktop | **Not done.** No physical devices. Issue 2 is a reasoned code fix that needs your confirmation on a real Samsung. |
| Inspect git history | **Not possible.** My working copy has no `.git` (you extract zips over your folder). |
| Audit production env vars | **Not possible.** Those live in Vercel only. |

Everything below marked "confirmed" was verified in code or by running it.

---

## 1. ROOT CAUSE

### Issue 1 — generic error around form submission

I found **three distinct defects**, all confirmed by reading the code. Any
one produces the exact message you quoted.

**(a) The rate limiter failed CLOSED — most likely culprit**

`checkRateLimit()` ran `count` + `create` against `rate_limit_attempts`
with no error handling, and it runs *before* enrollment is processed. If
that query failed for any reason — connection blip, pool exhaustion,
cold Neon compute — it threw, and the enrolment was blocked outright.

A protection against abuse was able to take the entire membership form
offline. That inverts the priority: not enforcing a limit for a few
seconds is far less harmful than blocking real applicants.

*Evidence:* `src/lib/rate-limit.ts` had no try/catch. Now covered by a
regression test that simulates the database being unreachable and asserts
the request is still allowed through.

**(b) Work after the application was saved could report a false failure**

In `submitApplication()`, once the application row was created, three more
things ran **unguarded**: creating the admin notification row, loading
email branding, and sending the confirmation email.

If any failed, the person saw an error — but their application *was
already saved*. They'd retry, hit the duplicate-index-number check, and
reasonably conclude it had failed entirely. This is precisely the
duplicate/confusion scenario the brief anticipated, and it was real.

*Evidence:* `src/lib/services/membership-service.ts` — `db.notification.create`
and `getEmailBrand()` sat outside any try/catch after the insert.

**(c) The root layout queried the database on every page load, unguarded**

`generateMetadata` in `src/app/layout.tsx` calls `getSiteSettings()`, which
was uncached and unguarded. Header, Footer and several pages call it too —
so a single page view fired 3–4 identical uncached queries, each a failure
point.

Because it's in the **root layout**, a failure there breaks *every page of
the site*, not one feature. Note the reported wording — "unexpected error
**loading this page**" — which points at page render, not form submission.
This likely explains reports that didn't correlate with submitting
anything.

### Issue 2 — Samsung shows only Camera / Photos & videos

**Root cause: the `accept` list led with the `image/*` wildcard.**

Chrome on Android converts `accept` into a system intent. A wildcard media
type makes Android treat the field as a **media picker**; Samsung's One UI
then shows its "Choose an action" sheet with only Camera and
"Photos & videos", with no route to a saved PDF in My Files or Drive.
Concrete MIME types instead produce a **document-picker** intent that opens
the full file browser.

**Why Tecno worked and Samsung didn't:** near-stock Android (Tecno) exposes
a "Browse"/Files entry even from the media chooser. Samsung's One UI
replaces that chooser with its own sheet that omits it. Same HTML, two
different pickers — which is exactly why your Tecno-vs-Samsung comparison
was the decisive clue.

**Correcting my earlier advice:** last round I told you mixed accept types
open the full file browser and that's the fix. That was wrong in your case,
and this is the second time I've misdiagnosed this field. Splitting it into
two inputs previously was also unnecessary. The fix now is standards-based
(explicit MIME types, no Samsung-specific branching) — but since I cannot
test on a Samsung, **please verify on the actual device before considering
it closed.**

---

## 2. DATABASE

- **Migrations in repo:** 9, including `20260905120000_rate_limiting`.
- **Applied in production:** yes — evidenced by your own screenshots, which
  showed `Applying migration 20260905120000_rate_limiting`, then
  `9 migrations found` and `Database schema is up to date!`.
- **`rate_limit_attempts` exists in production:** yes, per the same output.
- **Schema in sync:** yes, per `prisma migrate status`.
- **The `DEPLOY_NOTES` discrepancy the brief flagged:** not an error. That
  note belonged to a later, code-only round; the rate-limiting migration
  shipped with its own instructions in an earlier round and you ran it.
- **Connection config:** `src/lib/db.ts` selects Neon's serverless driver in
  production and node-postgres locally. Unchanged this round.

**Nothing destructive was run.** No reset, no drops, no truncation. This
round adds no migration.

---

## 3. FIXES

| File | Change | Reason |
|---|---|---|
| `src/lib/rate-limit.ts` | Wrap in try/catch; return `allowed: true` on failure | A limiter outage must never block enrolment |
| `src/lib/services/membership-service.ts` | Isolate notification / branding / email after the insert | A saved application must never be reported as failed |
| `src/lib/services/content-service.ts` | `getSiteSettings` now `cache()`d and falls back to defaults | Stops one query from breaking every page; 3–4 queries per page → 1 |
| `src/components/forms/EnrollmentForm.tsx` | `accept` uses explicit MIME types instead of `image/*` | Routes Android to the document picker; also aligns with what the server accepts |
| `src/components/forms/EnrollmentForm.tsx` | Reworded helper text | Names the actual accepted formats |
| `tests/unit/rate-limit-failopen.test.ts` | New | Proves fail-open with the database mocked as unreachable |

A side benefit of the `accept` change: the old wildcard let people pick
`.webp`/`.heic`, which `ALLOWED_DOCUMENT_TYPES` then rejected *after*
upload. Frontend and backend now agree, so unsupported types are filtered
at selection instead of failing later.

---

## 4. TEST RESULTS

```
Build:            pass
Type checking:    pass
Lint:             pass
Unit tests:       53 passed (7 files) — 2 new
Fail-open test:   pass (log confirms the fallback path ran)
Samsung Android:  NOT TESTED — needs your device
Tecno Android:    NOT TESTED — unchanged in spirit; explicit types are
                  as widely supported as the wildcard
Desktop / iPhone: NOT TESTED — `accept` is standard on both
```

---

## 5. REMAINING RISKS — honest list

1. **The Samsung fix is unverified.** Best-supported explanation, not proof.
   If it still fails, the next diagnostic is: does the picker differ between
   Chrome and Samsung Internet on that device? That distinguishes a browser
   issue from a One UI issue.
2. **I can't confirm which of the three Issue-1 defects your users actually
   hit.** All three were real; all three are fixed. If errors persist, the
   Vercel runtime logs will now name the stage — I kept the existing
   `[rate-limit]` / `[enroll]` / `[content]` prefixes for that.
3. **Orphaned R2 uploads remain possible.** If the database insert fails
   after files upload, those files stay in R2 unreferenced. Harmless (a
   little storage) and not user-facing, so I left it — worth a cleanup job
   if it ever matters.
4. **`MIN_HUMAN_SUBMIT_MS = 2000` is safe as written.** The form has a
   review step, so real submissions are always well past 2 seconds. I
   checked this rather than assuming.
5. **Rate limits are IP-based**, so a large shared campus NAT counts as one
   client. Limits were deliberately set high for this, and now fail open,
   so worst case is under-enforcement rather than lockout.
