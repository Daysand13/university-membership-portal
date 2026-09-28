# What you need to do, and what I can't

Some of this project needs an account only you can open, or a key only you
should ever hold. This is that list, in plain language, with what happens if
each one is skipped.

Nothing here is written yet in the code — the code is ready and waiting for
these values.

---

## 1. Firebase, for notifications (about 15 minutes)

You said yes to Firebase. I cannot create the project: it needs a Google
account the association controls, and I should not be signing into one.

1. Go to **console.firebase.google.com** and sign in with the association's
   Google account.
2. **Add project** → call it `ASSN` → you can turn Google Analytics off.
3. In the project, **Add app → Android**. The package name must be exactly:
   `com.assnuew.app`
4. It offers you a file called **`google-services.json`**. Download it and
   send it to me — it goes inside the app, and it is not a secret.
5. Now the server's half. **Project settings → Service accounts → Generate
   new private key**. That downloads a JSON file. **This one is a secret.**
   Do not email it, do not put it in the repository, and do not paste it into
   a chat.
6. Open it and copy three values into Vercel (Project → Settings →
   Environment Variables), for Production:

   | Name | Where it comes from in that file |
   |---|---|
   | `FIREBASE_PROJECT_ID` | `project_id` |
   | `FIREBASE_CLIENT_EMAIL` | `client_email` |
   | `FIREBASE_PRIVATE_KEY` | `private_key` — paste it whole, quotes and all |

**If you skip this:** everything else still works. Publishing news records
that a notification *would* have gone out and logs a warning, so nothing
breaks and nobody gets a surprise notification about last month's news when
you do set it up.

---

## 2. The release signing key (about 5 minutes, but do it carefully)

You said you'll own it. Good — that is the right answer.

This key is what proves an APK came from the association. Android will not
let an update install over the app unless it is signed with the same key.

**If this key is lost, no future update can ever install over the app.**
Everyone would have to uninstall and reinstall by hand, losing whatever is
stored on their phone. There is no recovery and no appeal; Google cannot help
because the app is not on Google Play.

So:

- Expo's build service can generate and hold it for you, which is the easy
  path and is genuinely safe.
- Or you generate it yourself and upload it. Either way, **keep your own copy
  somewhere that survives a lost laptop** — a password manager, or an
  encrypted file in two places.
- It must never be committed to this repository. I will not add it, and if I
  ever see it in a diff I will take it out.

---

## 3. A staging database (about 5 minutes)

You said go ahead. This also needs your Neon account.

1. Neon dashboard → the ASSN project → **Branches** → **New branch** from
   `main`, called `staging`.
2. Copy its connection string.
3. Send it to me and I will wire a staging environment to it.

**Why it matters:** right now there is nowhere to test against real-shaped
data. `.env.preview.local` points at a dead address on purpose, which keeps
production safe but means the login, news and events endpoints have never
been run against an actual database — only their refusal paths have. A
staging branch is a copy; nothing done to it can touch live records.

---

## 4. Where the APKs will live

Cloudflare R2, alongside everything else — no new account needed. I will add
a prefix for them when I build the release flow.

---

## 5. Decisions already made, for the record

| Question | Answer |
|---|---|
| Framework | React Native + Expo |
| Voting in the app | **No.** Members can see ongoing elections and, when the commission publishes them, results. No ballot is ever cast from a phone. |
| Patrons' portal | Included |
| Oldest Android | 8.0 (API 26) |
| APK hosting | Cloudflare R2 |

---

## 6. What I need from you to carry on

Only two things block the next stage:

1. **`google-services.json`** (step 1) — needed before notifications can be
   tested on a real phone.
2. **The staging connection string** (step 3) — needed before I can honestly
   say the login and content endpoints work, rather than only that they
   refuse bad requests correctly.

Everything else I can keep building without you.
