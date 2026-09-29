# Getting the APK

About twenty minutes, most of it waiting. You need a free Expo account —
nothing is installed on your machine beyond what is already in `mobile/`.

```bash
cd mobile
npm install
npx eas login
npx eas init
npx eas build --platform android --profile production
```

Run `npm run verify` before that last line. It bundles the JavaScript
exactly as the build server does, on your machine, in about a minute — and
that is the phase that fails. A break found here costs a minute; the same
break found on EAS costs the queue, the upload and twenty minutes, and
reports itself only as "Unknown error. See logs of the Bundle JavaScript
build phase."

`eas init` links this code to the project in your Expo dashboard. It asks
whether to link an existing project — say yes and choose **ASSN UEW** —
and writes the project id into `app.json` so builds land where you can see
them.

The build runs on Expo's servers. When it finishes you get a link; that
link downloads the APK, and that is the file you send round.

---

## What it will ask you, once

**"Generate a new Android Keystore?"** — say **yes**.

That keystore is the signing key. Expo generates it, keeps it, and uses it
for every future build. Saying yes is the right answer for this project:
it means there is no file for anyone to lose.

Afterwards, take your own copy anyway:

```bash
npx eas credentials
```

Choose Android → production → download the keystore, and put the file
somewhere that survives a lost laptop — a password manager, or an
encrypted copy in two places.

**Why it matters:** Android will not let an app be replaced by one signed
with a different key. Lose this key and no future update can ever install
over the app — every member would have to uninstall and reinstall by hand,
losing whatever the app had stored. There is no recovery, and nobody to
appeal to, because the app is not on Google Play.

This is also why I cannot send you a key. I cannot create one from here,
and a signing key that has been through a chat window is a signing key
that has been through a chat window. Let Expo hold it.

---

## Before the first build: two things

### 1. The website address

Open `mobile/eas.json` and check the production profile:

```json
"EXPO_PUBLIC_API_URL": "https://www.assnuew.com"
```

**With the www.** This guide used to say the bare `assnuew.com`, and builds
1 and 2 shipped with it. The bare domain redirects to www, and a redirect to
another host strips the sign-in token from every request — so signing in
appeared to work, and the app signed itself out a moment later. It also
meant no phone ever registered for notifications.

`npm run verify` now checks this before anything is bundled, and refuses an
address that redirects. That address is baked into the APK, so if the site
ever moves, a new build is needed.

### 2. The icon — done

The association's badge is in place, at every density Android asks for.
The white around it was flood-filled away from the edges rather than keyed
out by colour, so the three white figures inside the purple shield
survive; the layer behind it is white, because the black script and orange
arc are drawn for a white badge and all but disappear on the navy.

There is no themed (monochrome) icon. That has to be a single flat
silhouette, and a ring of text around a script monogram reduced to one
colour is a blob — Android falls back to the full-colour icon, which is
the better of the two outcomes.

---

## Sending it round

Put the APK where people can reach it — the association's own site or
storage, not a file-sharing link that expires.

People will meet Android's "install from unknown sources" warning. That is
normal for an app outside Google Play, and it is worth saying so when you
send it, because otherwise it reads as a virus warning.

## After the first release

Record it in **Admin → App Releases** so the app can update itself
afterwards. You need four things from the build:

| Field | Where it comes from |
|---|---|
| Version | `1.0.0`, from `app.json` |
| Build number | `1` for the first, and it only ever goes up |
| Where the APK is | the address you uploaded it to — https only |
| SHA-256 | `sha256sum assn-1.0.0.apk` on the file you uploaded |
| Size in bytes | `ls -l` on the same file |

Then press **Publish**. Every phone with the app checks on startup, and
from that point on you never have to send an APK round again — only record
the new build.

Leave "stop older versions working" at 0 unless you mean it. It stops
people mid-task until they have downloaded an update, which on a poor
connection is a real cost. It is for a security fix, and little else.
