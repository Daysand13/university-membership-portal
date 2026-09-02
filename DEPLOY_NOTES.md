# Deploying this update

## ⚠️ One-time extra step this round — read before running anything

Every previous round, you've just unzipped the files, `git push`ed, and Vercel
redeployed. **This round needs one extra, one-time step run locally first**,
because this is the first time this project uses real Prisma migrations
instead of `prisma db push`.

The short version of why this matters: your local `DATABASE_URL` and
production point at the **same live Neon database**, which already has real
applicant/member data in it (including, soon, medical report info). Prisma's
`migrate dev` command, the very first time it's ever run against a database
it doesn't recognize, can interpret "no migration history" as "this database
is out of sync — reset it?" and offer to **drop and recreate every table**.
That would delete real data. The steps below avoid that by explicitly telling
Prisma "this database's current schema is already accounted for" before
asking it to apply anything new.

## Steps (run these locally, in order, once)

```bash
# 1. Get the new Prisma Client and this update's code as usual.
npx prisma generate

# 2. Tell Prisma the CURRENT live schema is already accounted for.
#    This does NOT touch your database — it only records, in Prisma's
#    bookkeeping table, that the "0_baseline" migration (an intentionally
#    empty file already included in this zip) has already happened.
npx prisma migrate resolve --applied 0_baseline

# 3. Now apply the real change for this round (drops facultySchool, adds
#    medicalReportUrl to Members/Applications, adds backgroundColor to Hero
#    Slides). Because step 2 already told Prisma about the current state,
#    this will apply cleanly without any reset prompt.
npx prisma migrate dev
```

If step 3 ever prompts you with anything mentioning "reset" or "drop", **stop
and don't confirm it** — that's not expected, and it would mean something
about the live schema doesn't match what we assumed. Screenshot the prompt
and send it over rather than pressing yes.

After that, this round's zip-overwrite → `git add . / commit / push` →
Vercel auto-redeploy workflow is exactly the same as every previous round.

## After this round

From now on, every future schema change ships as a normal
`prisma/migrations/<timestamp>_<name>/` folder in the zip, and you'll just
run `npx prisma migrate dev` locally (no more baselining needed — that was
only because this was the first migration ever for this project).
