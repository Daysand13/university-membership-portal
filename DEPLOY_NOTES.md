# Deploying this update

The one-time database baselining from the previous round is done — you
won't need to repeat it. From now on, every schema change just needs:

```bash
npx prisma generate
npx prisma migrate dev
```

This round adds two new migrations (medical report fields from before were
already applied — these are new):

1. `20260902120000_membership_form_fields` — adds Academic Department, Hall
   of Affiliation, Specific Support Needed, and converts Membership Type to
   Regular / Distance / Sandwich.
2. `20260902130000_about_team_members` — adds Membership Eligibility and
   Partners/Stakeholders text fields to the About page, and a new table for
   Executive Leadership + Our Patrons.

Run the two commands above locally (same live database as always), then the
usual flow:

```bash
git add .
git commit -m "hero fixes, membership form overhaul, undergrad/postgrad split, about us sections"
git push
```

## A couple of things worth knowing about this round

- **Old membership applications/members with no Membership Type set**: the
  migration converts that column from free text to Regular/Distance/Sandwich.
  Since nothing on the site ever actually set this value before, existing
  rows should just have it blank (NULL) — that's expected and safe. If the
  migration ever complains about a value that doesn't match one of the three
  options, stop and send me the error rather than guessing.
- **Existing applications/members keep their old academic department value**
  in the "Category of Special Needs" field — that field's meaning didn't
  change. The new, separate "Academic Department" field (the real college
  department, like "Department of Special Education") will be blank for any
  application submitted before this update, since it didn't exist yet.
- **Residential address, region, and emergency contact** are still collected
  on the form (moved to an "Additional Information" section at the bottom) —
  they weren't in the new form blueprint you sent, but I kept them rather
  than silently dropping data collection, since the database still requires
  them for new applications. Let me know if you'd rather remove them
  entirely.
- **Leadership team and Patrons start empty** — add them from
  `/admin/team` after this deploys; they won't show on the About page until
  you do.
