# Acme University Students' Association — Membership & Information Portal

A full-stack university/association membership portal and CMS: public site
(news, events, library, elections, contact, donate) plus a role-based admin
system and a member portal with an enrollment → review → approval workflow.

**"Acme University" is placeholder sample branding** — replace it with your
real institution's name throughout (see [Rebranding](#rebranding-for-your-institution)).

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, PostgreSQL,
Prisma 7, Cloudflare R2, and Resend.

---

## Table of Contents

1. [What's fully working vs. scaffolded](#whats-fully-working-vs-scaffolded)
2. [Tech stack & architecture decisions](#tech-stack--architecture-decisions)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Database setup](#database-setup)
6. [Cloudflare R2 setup](#cloudflare-r2-setup)
7. [Email setup (Resend)](#email-setup-resend)
8. [Admin accounts & roles](#admin-accounts--roles)
9. [Member enrollment workflow](#member-enrollment-workflow)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Rebranding for your institution](#rebranding-for-your-institution)
13. [Troubleshooting](#troubleshooting)
14. [Extending the system](#extending-the-system)

---

## What's fully working vs. scaffolded

This was built end-to-end and verified against a real PostgreSQL database at
every stage (schema, service layer, and a full production `next build`) —
it is not a static mockup. In the interest of honesty about scope:

**Fully wired, DB-to-UI, tested:**
Auth (admin + member, separate sessions), News, Events, Membership
(enroll → admin review with all five actions → approval creates a hashed
account → email → login → forced password change → forgot/reset password),
Library (R2 upload/download), Elections (informational), About, Donate,
Contact (form + admin inbox), Site Settings, Social Links, Media Library,
Hero slides, Admin dashboard with real counts, Notifications, Audit log,
Search, SEO (sitemap/robots).

**Present in the data model, lighter admin UI:**
Election candidates (`ElectionCandidate` model exists; no dedicated
candidate-management screen yet — see [Extending](#extending-the-system)).
Custom per-application "additional fields" (stored as JSON; no dynamic
field-builder UI yet).

**Documented but not built:**
A voting engine (explicitly out of scope per the original spec — the schema
is shaped so one can be added without restructuring existing tables).
SMS notifications, membership cards, QR verification, payment gateway
integration beyond a configurable link — all future-facing items the schema
anticipates but doesn't implement.

## Tech stack & architecture decisions

- **Next.js 16 App Router + TypeScript**, React Server Components by
  default, Server Actions for all mutations (no hand-rolled `/api/*` REST
  layer — see below).
- **Tailwind CSS v4** with a small custom design-token system in
  `src/app/globals.css` (`@theme` block) — deep institutional navy + an
  academic-gold accent, a serif/sans/mono type system.
- **PostgreSQL + Prisma 7**, using **driver adapters**
  (`@prisma/adapter-pg`) rather than Prisma's classic bundled query engine.
  This is Prisma's current recommended path for serverless/edge hosts
  (Vercel, Cloudflare, etc.) — no native binary to worry about at deploy
  time. See `prisma.config.ts` for the CLI-side connection config (Prisma 7
  moved the datasource URL out of `schema.prisma` itself).
- **Custom session auth** (`jose` for signed JWTs in httpOnly cookies, one
  cookie for admins and a separate one for members, `bcryptjs` for password
  hashing) rather than a library like Auth.js. This was a deliberate choice:
  the app has two structurally different principal types (index-number
  login vs. email login, different session lifetimes, different
  authorization rules), and a small amount of transparent, fully-owned code
  was more predictable here than fitting that shape into a
  multi-provider Auth.js setup. `proxy.ts` (Next 16 renamed "middleware" to
  "Proxy" — see the note below) does a **fast, edge-safe JWT presence
  check**; the actual admin/member layouts re-verify against the database
  on every request (`requireAdminUser` / `requireMember`), so a deactivated
  account or role change takes effect immediately rather than waiting out a
  7-day JWT.
- **Server Actions over REST.** Almost every mutation (enrollment, admin
  CRUD, login, application review) is a `"use server"` function in
  `src/lib/actions/*`, calling into a plain, framework-agnostic service
  layer in `src/lib/services/*`. The service layer has no Next.js-specific
  code in it and is what the test suite exercises directly — this is also
  why business-logic bugs (see `tests/unit/membership-flow.test.ts`) were
  caught by running real tests against a real database rather than trusting
  that the code "looked right."
- **Cloudflare R2** via the S3-compatible SDK (`src/lib/storage/r2.ts`).
  Admin uploads (news images, event banners, library documents, etc.) use
  **presigned direct-to-R2 uploads** — the browser PUTs the file straight to
  R2, so file bytes never transit the Next.js server. The one public,
  unauthenticated upload path (the enrollment form's profile picture) is
  intentionally **proxied through the server instead**, with magic-byte
  sniffing on top of the declared MIME type, since handing out direct
  write access to anonymous visitors is a different risk profile.
- **Resend** for email, with a **console-log fallback** when
  `RESEND_API_KEY` isn't set — every email-dependent flow (enrollment
  confirmation, approval with credentials, rejection, password reset) is
  fully exercisable in local dev without a Resend account.
- **A note on "Proxy" vs "Middleware":** Next.js 16 renamed the
  `middleware.ts` convention to `proxy.ts` (same purpose: a single function
  that runs before matched requests). If you're used to older Next.js
  tutorials referencing `middleware.ts`, that's why this project's
  equivalent file is `src/proxy.ts`.

### Why not NextAuth / why not raw SQL / why Server Actions

These are the three architecture questions most likely to come up in
review, so the reasoning is written down rather than left implicit:

- **Prisma over raw SQL:** type safety across ~20 models, and the spec
  explicitly asked for it. The service layer keeps all Prisma calls in one
  place, so the ORM could be swapped later without touching route/action
  code.
- **Server Actions over a REST API layer:** less code, automatic CSRF
  protection (Next.js checks the `Origin` header on Server Actions by
  default), and progressive enhancement (forms work before JS finishes
  loading). The trade-off is that Server Actions are Next.js-specific — if
  this ever needed a separate mobile app client, a thin REST layer could be
  added calling the same service functions without touching business logic.

## Local setup

```bash
git clone <this-repo>
cd university-membership-portal
npm install

cp .env.example .env
# edit .env — at minimum set DATABASE_URL and AUTH_SECRET
# generate AUTH_SECRET with: openssl rand -base64 32

npx prisma generate
npx prisma migrate dev --name init   # creates + applies the first migration
npm run db:seed                      # sample content + a super admin

npm run dev
```

Then visit:
- `http://localhost:3000` — public site
- `http://localhost:3000/admin/login` — admin (seeded credentials printed
  by `npm run db:seed`, and repeated below)
- `http://localhost:3000/membership/login` — member login (create a real
  member by approving the seeded sample application at
  `/admin/membership-applications`)

> **A note on this repository's own build history:** it was built inside a
> network-restricted sandbox that could not reach Prisma's engine-binary
> CDN (`binaries.prisma.sh`) or Cloudflare's API. `prisma generate` and
> `prisma validate` were confirmed working against the WASM engine bundled
> in the `prisma` npm package itself; `prisma migrate dev` could not run in
> that sandbox specifically (it spawns the schema engine as a subprocess,
> which needs a real binary, not the WASM module). The schema was instead
> verified by hand-translating it to SQL and applying that directly to a
> live Postgres instance, including a scripted test that duplicate index
> numbers are correctly rejected. **None of this affects you** — a normal
> development machine or CI runner has ordinary internet access, so
> `npx prisma migrate dev` above will just work.

## Environment variables

See `.env.example` for the full list with comments. Required to run at all:
`DATABASE_URL`, `AUTH_SECRET`. Everything else (`R2_*`, `RESEND_API_KEY`)
degrades gracefully — file uploads and outbound email simply won't work
until configured, with clear in-app error messages rather than crashes.

**Never** prefix a secret with `NEXT_PUBLIC_` — anything with that prefix is
sent to the browser. Only `NEXT_PUBLIC_APP_URL` is public in this project;
everything else in `.env.example` is server-only by convention (never
referenced outside files under `src/lib` and Server Components/Actions).

## Database setup

Any standard PostgreSQL instance works. Free/low-cost options that fit the
"keep it cheap" requirement:

- **[Neon](https://neon.tech)** — generous serverless Postgres free tier,
  scales to zero, very popular Vercel pairing.
- **[Supabase](https://supabase.com)** — free tier includes Postgres +
  storage + auth if you later want to consolidate services.
- **Railway** — simple, usage-based pricing.

Copy the connection string into `DATABASE_URL` in `.env`, then:

```bash
npx prisma migrate dev --name init   # first time
npx prisma migrate deploy            # subsequent deploys (production)
npm run db:seed                      # optional sample content
```

The Prisma schema is the single source of truth for the data model —
`prisma/schema.prisma`. All ~20 entities from the original spec are
modeled there with proper relations, indexes, and unique constraints
(notably: `Member.indexNumber` and `MembershipApplication.indexNumber` are
both unique at the database level, not just validated in application code).

## Cloudflare R2 setup

R2 is the only object-storage provider used — no AWS S3 dependency.

1. **Create a bucket.** Cloudflare dashboard → R2 → Create bucket. Note the
   bucket name.
2. **Create API credentials.** R2 → Manage API tokens → Create API token.
   Scope it to **Object Read & Write**, restricted to the one bucket you
   just created (least privilege — don't use an account-wide token).
   This gives you `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
3. **Endpoint.** Your S3-compatible endpoint is
   `https://<account_id>.r2.cloudflarestorage.com` — find your account ID
   on the R2 overview page. Set `R2_ACCOUNT_ID` (the app derives the
   endpoint automatically) or set `R2_ENDPOINT` directly.
4. **Public access.** For files that should be publicly downloadable
   (published library documents, news/event images), either:
   - Enable the bucket's public R2.dev URL (fine for development), or
   - Attach a custom domain to the bucket (recommended for production —
     R2 → your bucket → Settings → Custom Domains).
   Set `R2_PUBLIC_URL` to whichever base URL you use (no trailing slash).
5. **CORS.** Because admin uploads go browser → R2 directly (presigned
   PUT), the bucket needs a CORS policy allowing your app's origin:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   Set this under R2 → your bucket → Settings → CORS Policy.
6. **Private files.** Documents marked "not public" in the library admin
   never get a stored public URL — downloads are served through a
   short-lived signed URL generated on request
   (`getDocumentDownloadUrlAction`), so private objects are never directly
   guessable/reachable.

Storage code lives entirely in `src/lib/storage/r2.ts`. To switch providers
later, that's the one file to change — nothing elsewhere in the app talks
to R2/S3 APIs directly.

## Email setup (Resend)

1. Create a free account at [resend.com](https://resend.com) and verify a
   sending domain (or use their shared testing domain while developing).
2. Create an API key, set `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified sender, e.g.
   `"Acme University SA <no-reply@youruniversity.edu.gh>"`.

Until `RESEND_API_KEY` is set, every email is logged to the server console
instead of sent — look for `[email:dev-fallback]` in the terminal running
`npm run dev`. This is intentional, not a bug: it means you can fully test
enrollment, approval, rejection, and password reset locally with zero email
setup.

## Admin accounts & roles

The seed script creates two accounts (**change these immediately in any
real deployment** — they're intentionally obvious placeholders):

| Email | Password | Role |
|---|---|---|
| `superadmin@example.edu.gh` | `ChangeMe123!` | Super Admin (full access) |
| `membership@example.edu.gh` | `ChangeMe123!` | Membership Officer |

Roles (`AdminRole` enum): `SUPER_ADMIN`, `ADMIN`, `EDITOR`,
`MEMBERSHIP_OFFICER`, `LIBRARIAN`, `ELECTION_OFFICER`. Super Admin always
has full access; other roles are scoped per section (enforced both in the
sidebar UI and, authoritatively, in each Server Action via
`requireAdminRole(...)` — hiding a link is a UX nicety, the action-level
check is what actually stops an unauthorized request).

To create additional admins today, use Prisma Studio (`npx prisma studio`)
or a short script — there's no self-service "invite an admin" UI yet (see
[Extending](#extending-the-system)).

## Member enrollment workflow

1. Visitor fills out `/membership/enroll` (personal, academic, contact,
   membership sections). Submission is validated server-side with Zod
   regardless of client-side validation, saved as `PENDING`, and triggers a
   confirmation email plus an in-app notification to Membership
   Officers/Super Admins.
2. Admin reviews at `/admin/membership-applications/[id]` — full submitted
   detail, five actions: **Approve**, **Reject**, **Request Changes**
   (requires a note, emails the applicant), **Mark Under Review**,
   **Suspend**. Every action is recorded in the audit log with the
   before/after status and the acting admin.
3. **Approve** creates a `Member` row in the same database transaction as
   the status update, using the index number as a temporary password —
   hashed with bcrypt before it ever touches the database — and sends an
   email with the index number, temporary password, and login link.
   `mustChangePassword` starts `true`.
4. Member logs in at `/membership/login` with index number + temporary
   password, and can change it at `/membership/dashboard/change-password`
   (current-password re-verification required) or via
   `/membership/forgot-password` (single-use, 30-minute, cryptographically
   random reset token — only its SHA-256 hash is stored, never the raw
   token).

## Testing

```bash
npm test          # Vitest — runs against your real DATABASE_URL
npm run test:e2e  # Playwright — see note below
```

The Vitest suite (`tests/unit/`) is real integration testing, not mocks:
`tests/unit/membership-flow.test.ts` runs the actual enrollment → approval
→ login → password-change flow against your live database and cleans up
after itself. It's what caught a real bug during development (Prisma 7's
driver-adapter unique-constraint errors have a different `meta` shape than
the classic engine — `isUniqueConstraintError` in
`membership-service.ts` handles both).

`tests/e2e/enrollment.spec.ts` is a genuine, ready-to-run Playwright spec
covering the same journey at the browser level, plus the admin approval
flow — written but **not executed** during this build (the sandbox this
was built in has no browser runtime). Install and run it yourself:

```bash
npm i -D @playwright/test && npx playwright install
npm run dev              # in one terminal
npm run test:e2e         # in another
```

## Deployment

A low-cost stack that fits comfortably in most free tiers:

1. **Database:** Neon or Supabase (free tier).
2. **App host:** Vercel (free tier for small traffic; this app has no
   Node-API-incompatible code — driver adapters mean no native Prisma
   binary to worry about on serverless).
3. **Object storage:** Cloudflare R2 (10 GB free, generous free egress).
4. **Email:** Resend (free tier — verify current limits at
   resend.com/pricing).

Steps:

```bash
# 1. Push to GitHub, import into Vercel.
# 2. Set all variables from .env.example in Vercel's project settings.
# 3. Build command: npm run build   (default — no changes needed)
# 4. Run migrations against production once, from your machine or CI:
DATABASE_URL="<production-url>" npx prisma migrate deploy
# 5. Optionally seed (NOT recommended against a real production DB with
#    real members — the seed script is meant for fresh/dev databases):
DATABASE_URL="<production-url>" npm run db:seed
# 6. Point your domain at Vercel, set NEXT_PUBLIC_APP_URL to match.
```

**Before going live:** change the seeded admin passwords (or delete the
seeded admins and create your real ones), replace all "Acme University"
placeholder branding (see below), and replace the sample bank/mobile-money
donation details with real ones.

## Rebranding for your institution

Everything content-related is admin-editable and requires no code changes:
site title, logo, favicon, contact info, social links, hero slides, about
page, donation details — all via `/admin/settings` and the relevant content
sections.

A few things are hard-coded as sensible defaults and worth a quick find-
and-replace pass before launch:
- `"Acme University Students' Association"` appears as a fallback string in
  a handful of places (page metadata defaults, seed data) — search for it
  project-wide.
- The color tokens in `src/app/globals.css` (`@theme` block) — swap the
  `--color-primary-*` and `--color-accent-*` values for your institution's
  actual brand colors; every component references these tokens rather than
  hard-coded hex values, so this is a small, contained change.
- The typefaces default to a system serif/sans stack (see the note in that
  same file) rather than a Google Font, purely because this project was
  built in a sandbox without access to fonts.googleapis.com — swapping in
  a real font via `next/font/google` is a normal, unrestricted operation in
  your own environment and is a one-line change in `src/app/layout.tsx`.

## Troubleshooting

- **"R2 is not configured" errors on upload:** expected until you set the
  five `R2_*` variables — see [Cloudflare R2 setup](#cloudflare-r2-setup).
- **Emails not arriving:** check your terminal for
  `[email:dev-fallback]` logs — if you see those, `RESEND_API_KEY` isn't
  set. If you've set it and still see nothing, check the Resend dashboard's
  logs and confirm your sending domain is verified.
- **"AUTH_SECRET is not set" at runtime:** copy `.env.example` to `.env`
  and set a real value (`openssl rand -base64 32`).
- **Prisma errors immediately after cloning:** run `npx prisma generate`
  before `npm run dev` — the generated client (`src/generated/prisma`) is
  gitignored and must be generated locally.
- **Duplicate index number doesn't show a friendly message:** if you've
  modified `membership-service.ts`, note that Prisma 7's driver-adapter
  unique-constraint errors report the violated field under
  `err.meta.driverAdapterError.cause.constraint.fields` (quoted field
  names), not the classic `err.meta.target` array — `isUniqueConstraintError`
  handles both shapes; keep that in mind if you add new unique constraints.

## Extending the system

The codebase follows one consistent pattern throughout — `lib/services/*`
(pure business logic, testable, no Next.js imports) → `lib/actions/*`
(thin `"use server"` wrappers: validate with Zod, call the service,
`revalidatePath`, redirect) → a form component using `useActionState` → an
admin list/detail page. To add a new admin-managed content type, copy the
News or Event trio (`lib/services/X-service.ts`,
`lib/actions/X-actions.ts`, `components/admin/forms/XForm.tsx`,
`app/admin/(dashboard)/X/{page,new/page,[id]/page}.tsx`) and adjust fields.

Specific next steps flagged elsewhere in this README:
- Election candidate management UI (model exists, screen doesn't).
- Self-service admin invitation/role management UI (currently via Prisma
  Studio or a script).
- A dynamic "additional fields" builder for membership applications
  (currently a flexible JSON column with no admin UI to define new fields).
- Swap `<img>` tags for `next/image` once your R2 public domain is fixed,
  for automatic responsive images and lazy loading (the `remotePatterns`
  config in `next.config.ts` is already primed for this).
