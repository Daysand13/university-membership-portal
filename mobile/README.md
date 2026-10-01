# ASSN — the Android app

The association's app, built with React Native and Expo. It talks to the
website's own API at `/api/v1/app/` and keeps no data of its own, so
anything an administrator publishes on the website appears here without a
new release.

## What it is

**Signed out**, it is a welcome screen, signing in, and the four ways to
join: undergraduate, postgraduate, alumni and patron. The forms are the
website's own, field for field and in its words, and the server checks them
with the same code (`src/lib/services/registration-service.ts`). A
student's passport photo and medical report go straight from the phone to
storage, as on the website.

**Signed in**, it is the member's dashboard, with News, Events and More
along the bottom.

The two halves are guarded in `app/_layout.tsx` (`Stack.Protected`): when
a session starts or ends, the router moves to the half that now applies.
No screen navigates by hand on signing in or out — keep it that way.

**On every screen**, the website's accessibility controls, in the header:

- **Read Aloud** reads the screen in front — its words, its buttons and its
  boxes — in the website's own wording ("First name, text box, empty.").
  See `src/a11y/reading.tsx` for how; the short version is that everything
  that says something registers what it would say, through the `Text`
  component and the controls in `src/ui/`. **Use `src/ui/Text`, never
  React Native's `Text`**, or Read Aloud will skip it.
- **Display**: three text sizes, high contrast, dark mode, saved on the
  phone. Every colour comes from `src/theme.ts`, and
  `tests/theme.test.ts` holds each palette to its contrast floor.

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
| `src/ui/` | The pieces every screen is built from, and the form controls |
| `src/a11y/` | Read Aloud, and the display settings |
| `src/join/` | Signing up: the options, attachments, drafts |
| `tests/` | `npm test` — contrast, Read Aloud's wording, photo sizing, the API client, the hash |

## Three things that are not obvious

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

**`npx expo-doctor` reports three failures, and all three are meant to be
there.** Worth knowing before you act on its advice, because two of its
suggestions would break this app.

| What it says | Why it stays |
|---|---|
| `disableHierarchicalLookup` should be false | That switch is what stops the double React above. Taking its advice causes the bug its next check reports. |
| Two copies of React | The same thing, seen from the other side: the website's React at the repository root. Metro never reaches it, and EAS only uploads this folder, so the cloud build never sees it either. |
| eas-cli should not be a dependency | It is here so `npx eas` works in this folder. Without it npm looks for a package called `eas`, which is not eas-cli, and the error it gives says nothing about that. It is a devDependency, so it is not in the APK. |

The version check is *not* in that list — if it starts failing, run
`npx expo install --fix`. Being on the patch versions the SDK expects is
worth keeping, since a cloud build is twenty minutes to discover otherwise.

## Still to do

- Mentorship, barrier reports and support requests are phase two.
- CVs, letters, dues payments and the further-studies form stay on the
  website.
