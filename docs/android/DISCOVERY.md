# ASSN Android app — Phase 1: what the website already is

This is the discovery report the project brief asks for before any app code is
written. It says what the existing system actually does, what an Android app
can reuse, what would have to be built, what it would cost, and what I need
decided before starting.

Nothing in this document changes the website. No app code has been written.

---

## 1. In one page, for the project owner

The website is **not** a collection of web pages sitting on top of an API.
It is a Next.js application where the browser and the server are two halves
of the same program: when a member saves their CV, the browser calls a
function *on the server* directly, and the server sends back new HTML. There
is no "save CV" web address an Android app could call.

That matters more than anything else in this report:

> **About 95% of what members and graduates do on the site has no interface an
> Android app can talk to.** Building the app is mostly building that
> interface — a proper mobile API — and only then the screens.

This is not a fault in the website. It is the normal, and generally better,
way to build a site of this kind. But it means "make an Android app" is
roughly two projects: the API, then the app.

The good news:

- The **database, rules and permissions can all be reused as they are.** No
  second database, no duplicated membership records. Everything the app shows
  comes from the same tables the website writes to, so an administrator
  publishing news on the website will see it in the app without anyone
  releasing a new version.
- There is already **one working API of exactly the right shape** — the one
  the ASSN Ballot terminals use (`/api/v1/…`). It authenticates, rate-limits
  and returns consistent JSON. The mobile API should be built the same way,
  next to it.
- File storage (Cloudflare R2) already works by handing out short-lived
  upload permits. The app can use that unchanged, and no storage password
  ever goes inside the app.

The harder news:

- **There is no push-notification system at all today.** Members get email.
  Sending a phone notification when news or an event is published needs new
  work on the website side: somewhere to remember each phone, and something
  that sends to them when an administrator presses Publish.
- **Full feature parity is not a sensible first release.** The site has 110
  pages, 68 database tables and 60 services. A first app that does the
  valuable 20% well is worth more than a half-built app that does everything
  badly. My proposed split is in section 9.

---

## 2. Existing technology

| Thing | What it is |
|---|---|
| Framework | Next.js 16.3.1, App Router, React 19.2.8, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL on Neon, via Prisma 7 |
| Hosting | Vercel |
| File storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Payments | Paystack |
| Scale | 68 models, 50 enums, 60 services, 34 server-action files, ~110 pages, 32 API routes |

---

## 3. Authentication, exactly as it works now

- Sessions are **JSON Web Tokens signed with `AUTH_SECRET`** (HS256, via
  `jose`), stored in **httpOnly cookies**, valid for **7 days**.
- There are five separate session cookies: `admin_session`, `member_session`,
  `alumni_session`, `patron_session`, and a unified `user_session` that the
  newer `/login` issues. Member and alumni code accepts either its own legacy
  cookie or the unified one — an identity migration that is still in flight.
- `src/proxy.ts` (edge middleware) does a cheap "is there a validly signed
  cookie" check. It is **deliberately not** the real check. The real check is
  in each portal's layout: `requireMember()`, `requireAlumni()`,
  `requirePatron()`, `requireAdminUser()` / `requireCapability()`, all of
  which hit the database and can turn away a suspended account.
- Administrators additionally have a **capability system**: six roles, each
  with a default set of permissions, plus per-account overrides.

**Two consequences for the app:**

1. Cookies are the wrong fit for a native app. The app should get a
   **short-lived access token plus a refresh token**, which is a small
   addition, not a rewrite — the signing and verifying code already exists.
2. Today's tokens are **stateless and cannot be revoked**. If a member loses
   their phone, there is no way to end that session before the 7 days are up.
   For a browser that is a tolerable trade. For a phone in Ghana that has
   been stolen, it is not. The app should therefore come with a small
   `MobileDevice` table so a session can be cut off — see section 6.

---

## 4. What the existing 32 API routes are

They are **not** a member API. They are:

| Group | Routes | Auth |
|---|---|---|
| Ballot terminals | `/api/v1/members/verify`, `/api/v1/elections/{schedule,candidates,votes}` | Station code + key headers |
| Documents produced as files | CV (member & alumni), ID card, letters, dues receipt | Session cookie |
| Upload permits | enrollment, student, patron, admin, alumni further-studies | Session cookie |
| Admin exports | members, alumni, dues ledger | Session cookie |
| Payments | Paystack callbacks and webhook | Signature / reference |
| Attachments | broadcast attachment, report evidence | Session cookie |

`/api/v1/*` is the model to copy. It already has: bearer-style header auth,
per-key rate limiting on a database table, consistent `{ ok, error }` JSON,
and a deliberate absence of CORS headers (which is correct — a native app
does not need CORS, and not having it keeps browsers out).

---

## 5. Feature inventory and what the app should do with each

"Native" means a real Android screen calling a mobile API. "Web view" means
the existing page opened inside the app, which is the right answer for long
one-off forms nobody fills in twice.

### Public (no login)

| Website feature | Exists | Android | Approach |
|---|---|---|---|
| Home, About, Contact | Yes | Yes | Native |
| News list, article, categories, search | Yes | Yes | Native — needs API |
| Events list, event detail | Yes | Yes | Native — needs API |
| Library / documents | Yes | Yes | Native list, system viewer for the file |
| Our Proud Alumni + public alumni profiles | Yes | Yes | Native — needs API |
| Elections information | Yes | Yes | Native — needs API |
| Allies, Assistive Technology, Tech & Tutorials | Yes | Yes | Native list |
| Donate | Yes | Yes | Web view (Paystack) |
| Membership enrollment (undergrad/postgrad) | Yes | Yes | **Web view** — a long form with file uploads, filled in once |
| Search across the site | Yes | Yes | Native — needs API |

### Member portal

| Website feature | Exists | Android | Approach |
|---|---|---|---|
| Dashboard | Yes | Yes | Native |
| Profile (view/edit) | Yes | Yes | Native — needs API |
| Announcements feed | Yes | Yes | Native — the app's main feed |
| Dues status and history | Yes | Yes | Native read; paying = web view |
| ID card | Yes | Yes | Native screen, image from existing route |
| CV builder | Yes | Later | **Web view** — a big multi-section form |
| Letters | Yes | Later | **Web view**, download the PDF |
| Elections & self-nomination | Yes | **Decision needed** | See section 8 |
| Events | Yes | Yes | Native |
| Mentorship (chat, sessions, calls) | Yes | Phase 2 | Native chat; the call already works in a browser |
| Rights / barrier reports | Yes | Phase 2 | Native, with photo/voice upload |
| Support requests | Yes | Phase 2 | Native |
| Academic & study groups | Yes | Phase 2 | Native |
| Change password | Yes | Yes | Native |

### Alumni portal

| Website feature | Exists | Android | Approach |
|---|---|---|---|
| Dashboard, profile, records | Yes | Yes | Native |
| Directory | Yes | Yes | Native |
| Announcements, events | Yes | Yes | Native |
| Career updates, opportunities | Yes | Phase 2 | Native |
| Mentorship (as mentor) | Yes | Phase 2 | Native |
| Giving | Yes | Yes | Web view (Paystack) |
| CV, letters, further studies | Yes | Later | Web view |
| Advocacy backing | Yes | Phase 2 | Native |

### Patrons' portal and Admin

| Area | Android | Why |
|---|---|---|
| Patrons' portal (14 pages) | **Not in v1** | A handful of users, all on desktops. Web view if ever needed. |
| Admin dashboard (~45 pages) | **Not in v1** | Administrators work at a desk; the admin pages were made to work on a phone browser earlier this month. |

---

## 6. Recommended architecture

### 6.1 The app itself — recommendation with the trade-off stated

| Option | For | Against |
|---|---|---|
| **React Native + Expo** | Same language as the whole project; the zod validation rules and Prisma types can be **shared, not re-written**, so the app cannot drift out of step with the site's rules; EAS Build produces signed APKs; mature FCM and file-system libraries | Bigger APK (~25–40 MB) and slower cold start than native |
| Kotlin + Jetpack Compose | Fastest, smallest (~8–15 MB), best on an itel or a Tecno | A second language and toolchain for a project maintained by one person who writes TypeScript; every validation rule written twice, and the two copies will diverge |
| Flutter | Fast, good UI | A third language (Dart), and no code sharing at all |

**I recommend React Native with Expo** (a development build, not Expo Go),
and I want to be straight about why: the deciding factor is not performance,
it is that duplicated validation rules rot. The association's rules about
levels, dues tiers, index numbers and eligibility live in `src/lib/validations`
today; sharing them keeps one copy. The cost is a heavier app.

**Choose Kotlin instead if** the app must feel perfect on a sub-2GB-RAM phone,
and you accept maintaining the rules twice. That is a legitimate choice and I
will build it that way if you prefer — but it should be a decision, not a
default.

### 6.2 The mobile API

Built beside the existing one, as `/api/v1/app/…`, reusing every service
already written. No new business logic, no second database.

- **Login** returns a 15-minute access token and a long-lived refresh token.
- Refresh tokens are **stored hashed in a new `MobileDevice` table** with the
  device name and last-seen time, so a member can see their signed-in phones
  and an administrator can cut off a stolen one. This is the revocation the
  website does not have today.
- Access tokens carry an `aud: "mobile"` claim so a mobile token can never be
  replayed as a website cookie, or the reverse.
- Rate limiting reuses the existing database-backed limiter with its own keys.
- Authorisation is enforced **on the server**, by the same `requireMember` /
  capability code the website uses. The app hiding a button is presentation,
  never security.

### 6.3 Push notifications (the NB requirement)

Nothing exists today, so this is genuinely new:

1. A `MobileDevice` row holds the FCM token alongside the refresh token.
2. `POST /api/v1/app/devices` registers and refreshes it.
3. When `setNewsStatus(...)` publishes an article, or `createEvent` /
   `updateEvent` publishes or changes an event, the existing service calls a
   new `push-service` that sends to the right audience.
4. Firebase Cloud Messaging, server key held in Vercel's environment. **No
   Firebase secret goes in the APK** — the app only ever holds its own device
   token.
5. Per-member preferences (news / events / announcements / mentorship), with
   a quiet default: publishing does not mean everyone gets buzzed at 2am.

### 6.4 Updates without Google Play

- `GET /api/v1/app/version` returns a signed manifest: version, build number,
  APK URL, SHA-256, size, changelog, minimum supported version.
- APKs live in R2, served through the website.
- The app downloads, **checks the SHA-256**, and hands the file to Android's
  package installer, which checks the signing certificate itself — an APK not
  signed with the association's release key cannot replace the installed one.
  That check is Android's, not ours, and is the one that actually matters.
- Optional and mandatory updates both supported; the release key never goes
  in the repository.

---

## 7. Security findings in the existing system

Found while reading, ranked by what I would fix first. None is an emergency.

1. **Sessions cannot be revoked** (7-day stateless JWT). Fine for a browser;
   poor for a lost phone. The `MobileDevice` table fixes it for the app and
   could later be extended to the website.
2. **One secret signs everything.** `AUTH_SECRET` signs admin, member, alumni
   and patron sessions alike. Adding an audience claim for mobile tokens
   prevents cross-use; separating the secrets entirely would be better still.
3. **R2 has a public base URL.** Some objects are served publicly by design
   (logos, news images). It must stay true that medical reports, evidence
   photos and documents go through an authorised route — the app must not
   make any of them public by accident.
4. **`PAYSTACK_SECRET_KEY` is still unset in production**, so dues, donations
   and document payments cannot be taken online anywhere — website or app.
5. **No staging database.** The brief requires dev/staging/production.
   `.env.preview.local` points at a dead address, which is good for safety but
   is not a staging environment. A Neon branch would give a real one.

---

## 8. Two decisions that are not mine to make

**Voting from a personal phone.** ASSN Ballot was deliberately designed around
a *supervised terminal*: a registered station, a key typed in by a commission
officer, a voter verified by index number at the desk. Voting from a member's
own phone removes the supervision that design depends on — it is a change to
how the association runs its elections, not a feature to be coded quietly. The
app can safely show elections, candidates and published results; whether it
should also take votes is the Electoral Commission's decision.

**The feed's social features.** Likes, comments and sharing were listed as
"if appropriate". My recommendation is **not in v1**: comments on an
association feed need moderation, and moderation needs a moderator. Better to
ship the feed, see whether people ask, and add it deliberately.

---

## 9. Proposed phasing

| Release | Contents | Rough effort |
|---|---|---|
| **v1.0** | Public content (news, events, library, alumni, elections info), login for members and alumni, dashboard, profile, announcements feed, dues status, ID card, **push on news and events**, in-app updates, offline cache | The bulk of the work |
| **v1.1** | Mentorship (chat, sessions, joining a call), barrier reports with photo/voice, support requests | Smaller |
| **v1.2** | Opportunities, career updates, advocacy backing, study groups | Smaller |
| **Later** | CV, letters, enrollment — likely web views permanently | Small |

---

## 10. What I need from you before Phase 2

1. **Framework**: React Native + Expo as recommended, or Kotlin + Compose?
2. **Voting in the app**: show-only, or does the commission want voting too?
3. **Firebase**: may I set up a Firebase project for notifications? It is free
   at this scale and needs a Google account the association controls.
4. **APK hosting**: Cloudflare R2, alongside the existing files?
5. **Oldest phone to support**: Android 8 (2017) covers almost everything in
   use; Android 7 costs a little extra work.
6. **Patrons' portal in the app**: needed, or leave it to the website?
7. **Staging database**: may I create a Neon branch for a staging environment?
8. **Who owns the release signing key?** It must not live in this repository,
   and if it is lost no future update can ever install over the app.
