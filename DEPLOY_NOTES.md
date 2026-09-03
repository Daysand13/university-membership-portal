# Deploying this update

Same flow as before — one new migration this round:

```bash
npx prisma generate
npx prisma migrate dev
git add .
git commit -m "postgraduate form, gold enroll cards, campus/hall updates, readable checkboxes"
git push
```

## What's in this round

1. **Gold-accented enroll cards** — Undergraduate/Postgraduate choice cards on
   `/membership/enroll` now use the site's gold accent color instead of plain
   white/navy.
2. **Hall of Affiliation** updated to: Ghartey Hall, GUSSS Hall, Kwegyir
   Aggrey Hall, Simpa Hall, University Hall, Other Hall. *(One judgment call
   here worth double-checking: your message listed "kwegyir, aggrey" as
   separate items — I kept them as one "Kwegyir Aggrey Hall" entry, matching
   the real UEW hall name from the original blueprint, rather than splitting
   into two halls that don't otherwise exist. Let me know if you actually
   meant two separate halls.)*
3. **Campus** narrowed to just Winneba Main Campus and Ejumako Campus.
4. **Postgraduate registration form is now live** (was a "coming soon" page
   before) — Postgraduate Degree Category, the full postgraduate department
   list, the full postgraduate program list, and Year 1–4 instead of Level
   100–400, all from the document you sent. Everything else (personal info,
   category of special needs, uploads, consent) matches the undergraduate
   form.
5. **Specific Support Needed checkboxes** now use dark, bold text instead of
   the lighter gray from before, for better readability.

## Under the hood

- Existing applications/members from before this round will show a blank
  "Study Level (Track)" in admin — that's expected, since older records
  don't know which track they came from. Every new submission going forward
  is tagged automatically.
- The database column that stores Campus/Hall/Department/Programme values is
  just plain text either way, so this update doesn't touch or invalidate any
  previously submitted application data — old entries keep whatever values
  they already had, even the old-format ones (e.g. "Winneba Campus (Main
  Campus)").
