# ASSN — the Android app

The association's app, built with React Native and Expo. It talks to the
website's own API at `/api/v1/app/` and keeps no data of its own, so
anything an administrator publishes on the website appears here without a
new release.

## Running it

You do not need Android Studio or a Java installation. Expo builds in the
cloud.

```bash
cd mobile
npm install
npx expo start          # then scan the code with Expo Go, or use a dev build
```

To point it at a different site while developing:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 npx expo start
```

`10.0.2.2` is how an Android emulator reaches the machine it runs on.

## Building an APK

```bash
npx eas build --platform android --profile production
```

The profiles are in `eas.json`. `development` points at a local machine,
`staging` at the staging site, `production` at the live one. Each build
says which it is: any build that is not production shows the environment
at the bottom of the More tab, so a tester never has to wonder.

**The first production build asks who should hold the signing key.** Let
Expo generate and keep it, or upload your own. Whichever you choose, keep
a copy somewhere that survives a lost laptop — if that key is lost, no
future update can ever install over the app, and everybody would have to
uninstall and reinstall by hand.

## What is in here

| Folder | What it holds |
|---|---|
| `app/` | The screens. File names are the routes, as in Next.js |
| `src/api/` | The client, and the shapes the server sends |
| `src/auth/` | Signing in, and where tokens are kept |
| `src/push/` | Asking for notifications and registering this phone |
| `src/update/` | Checking for, verifying and installing a new APK |
| `src/ui/` | The pieces every screen is built from |
| `tests/` | `npm test` — the hash and the API client |

## Two things that are not obvious

**`google-services.json` is committed on purpose.** It is meant to ship
inside every copy of the app, and the key in it is tied to the package name
and signing certificate — it cannot read the association's data or send
anything. The file that *is* secret is the Firebase **service account**,
which lives in the website's environment variables and never comes near
this folder.

**`metro.config.js` stops dependency lookup escaping this folder.** The app
sits inside the website's repository, and the website has its own copy of
React for a different renderer. Without that config a build could end up
with two Reacts in it and fail in ways that look nothing like their cause.

## Still to do

- The association's logo is still not set in the website's **Admin →
  Settings**, which is why printed ID cards have no crest. The app has it, at
  `assets/association-logo.png`; uploading it there gives the website the
  same.
- No dark mode. The website has one and several members use it, so this is
  worth doing rather than an oversight.
- Mentorship, barrier reports and support requests are phase two.
- CVs, letters and enrollment stay on the website, where the long forms and
  file uploads already work.
