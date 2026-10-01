# The app's API

Everything the Android app talks to lives under `/api/v1/app/`, beside the
ballot terminals' `/api/v1/`. It reuses the website's services rather than
repeating their rules, so the two can never disagree about who may see what.

Every reply is JSON and every reply has an `ok`:

```json
{ "ok": true,  "news": [ … ] }
{ "ok": false, "error": "Please sign in.", "code": "no_token" }
```

`error` is written to be shown to a member as it stands. `code` is for the
app to branch on.

## Signing in

`POST /api/v1/app/auth/login`

```json
{ "identifier": "220010345", "password": "…",
  "device": { "deviceName": "Tecno Spark 10", "appVersion": "1.0.0", "androidSdk": 33 } }
```

An index number or an email address, exactly as the website's unified
sign-in accepts. Three possible answers:

- **One portal** — tokens, and who they belong to.
- **Two portals** (somebody who is both a student and a graduate) —
  `{ "ok": true, "chooseFrom": [ … ] }`. The app shows the choice and calls
  again with `"audience": "MEMBER" | "ALUMNI" | "PATRON"`.
- **No** — `401`, with one message for a wrong password and an unknown
  account alike. Telling them apart is how somebody discovers which
  addresses exist.

Limited to 8 attempts per identifier and 40 per address in ten minutes, the
same as the website. The app is not a quieter door into the same building.

## Staying signed in

`POST /api/v1/app/auth/refresh` — `{ "refreshToken": "…" }`

An access token lasts **15 minutes**; a refresh token lasts **60 days** of
use. Each refresh returns a new pair and the old refresh token stops
working, so a phone holds exactly one.

Presenting a spent one means it has been copied, and every session in that
family is cut off. The honest phone is asked to sign in again, which is the
right outcome: something has gone wrong and it is better to be sure.

`POST /api/v1/app/auth/logout` — ends this phone only, and takes its Firebase
address with it. A phone with no valid session still gets `ok: true`; there
is nothing the person could do about it.

## When a request is refused

| `code` | What the app should do |
|---|---|
| `no_token` | Send them to sign in — unless the request *carried* a token, in which case it was lost in transit (a redirect drops it) and is a problem to retry, not a session ending |
| `session_expired` | Refresh once, then retry the request |
| `invalid_fields` | A form needs correcting; `fieldErrors` has the message for each box |
| `device_revoked` | Sign out and clear the tokens |
| `account_inactive` | Sign out, and say the account is not active |
| `wrong_audience` | A bug in the app — it asked for another portal's data |
| `rate_limited` | Wait, and say so |

`account_inactive` is checked on **every** request against the database, not
taken from the token. Suspending somebody takes effect at once.

## What there is so far

| Method and path | Sign-in needed | What it gives |
|---|---|---|
| `GET /news?page&pageSize&category&q` | No | Published articles, newest first |
| `GET /news/{slug}` | No | One article, plus three related |
| `GET /events?when=upcoming\|past&page` | No | Published events |
| `GET /events/{slug}` | No | One event |
| `GET /me` | Yes | The signed-in person, as the app shows them |
| `GET /devices` | Yes | Their signed-in phones |
| `POST /devices` | Yes | Register the Firebase address and preferences |
| `GET /version?build&sdk` | No | Whether to update — see below |

News and events are open without signing in on the server, exactly like the
website's pages. The app itself shows them only once somebody has signed in,
as the dashboard's tabs — that is a choice about the app, not a protection,
and nothing here depends on it. Only PUBLISHED rows come back, through the
same calls the website makes: a draft cannot leak here without leaking there
first.

`pageSize` is capped at 40 and `page` at 500. Each list says `hasMore`, so an
infinite scroll never has to work out for itself whether page 9 of 8 exists.

### Joining

| Method and path | Sign-in needed | What it does |
|---|---|---|
| `GET /join/options` | No | Every list the sign-up forms offer, from the same place the website's forms read them |
| `POST /join/upload` | No | A signed, short-lived address to put a passport photo or medical report, and a ticket for it |
| `POST /join/student` | No | An undergraduate or postgraduate application (`track`), waiting for review |
| `POST /join/alumni` | No | A graduate's alumni account — active at once, and answered like a sign-in, with tokens |
| `POST /join/patron` | No | A patron's application, waiting for approval |

Every check is the website's own: both front doors call
`src/lib/services/registration-service.ts`. Rate limits use the website's
keys, so an address has one allowance, not two. The student route has no
hidden-field bot trap (meaningless in an app); what stands in for it is the
medical report, which is required, and whose ticket can only be had by
uploading a file through `/join/upload`.

The address the app is built against must be the one that answers —
`https://www.assnuew.com`. The bare domain redirects, and a redirect to
another host drops the Authorization header from every signed-in request.
`npm run verify` refuses to bundle against an address that redirects.

### Still to build

The ID card.

## Notifications

`POST /devices` with `{ "pushToken": "…", "preferences": { "news": true } }`,
once after the person allows notifications and again whenever Firebase
rotates the token — which it does on its own schedule.

`"pushToken": null` means stop sending to this phone. That is not the same as
signing out, and members should have both.

The server sends when an administrator publishes:

| What | When |
|---|---|
| News | The article becomes PUBLISHED |
| Event | The event becomes PUBLISHED |
| Event changed | Its date or venue moves after people were already told |

Once each, whatever happens afterwards — publishing, unpublishing and
publishing again all run through the same code, and `push_dispatches` is what
stops four notifications about one article. Rewording a description sends
nothing.

Each notification carries `data.path` (`/news/agm-2026`), which is the screen
to open when it is tapped.

## Updating the app

`GET /api/v1/app/version?build=140&sdk=33` — open without signing in,
because an app too old to sign in must still be able to update itself.

```json
{ "ok": true, "action": "offer", "release": {
  "version": "1.4.0", "buildNumber": 141,
  "apkUrl": "…", "sha256": "…", "sizeBytes": 28000000,
  "changelog": "…", "minimumBuild": 0, "minAndroidSdk": 26 } }
```

| `action` | The app should |
|---|---|
| `none` | Say nothing |
| `offer` | Offer it, with a Later button |
| `require` | Insist — the old build is below `minimumBuild` |
| `unsupported-device` | Say this phone's Android is too old, and stop asking |

`require` is for a security fix or a change that breaks the old app's calls,
and nothing else: it stops somebody on a poor connection in the middle of
what they were doing.

The phone checks the SHA-256 of what it downloads before it does anything
with it. Android then checks the signing certificate itself before allowing
the install — that is the check that actually stops somebody else's APK
replacing this one, and it is Android's, not ours.

## What is not here, deliberately

- **No voting.** Elections and published results can be read. No ballot is
  ever cast from a phone; ASSN Ballot's supervised terminal is the only way
  a vote is taken.
- **No admin.** The admin pages are the website's, and they work on a phone
  browser.
- **No secrets in the app.** No database credentials, no R2 keys, no Firebase
  server key, no signing key. Anything inside an APK should be assumed
  readable by anyone who wants to read it.
