# ASSN — the Android app

The React Native (Expo) app lives here. The Expo project itself is not built
yet; this directory currently holds the Firebase configuration it will need.

## `google-services.json`

Firebase project `assn-af6b0`, package `com.assnuew.app`.

**This file is committed on purpose.** It is not a secret — it is designed to
ship inside every copy of the app, and Google expects it to. The `api_key` in
it is a client key tied to the app's package name and signing certificate; it
cannot be used to read the association's data or to send notifications.

The file that *is* secret is the **service account key** — the one used to
send notifications from the server. That never comes near this repository.
It lives in Vercel as three environment variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Whether those took is visible at a glance: the **System Health** light in the
admin header now has an "App notifications" line, which says either that
Firebase isn't connected, or how many phones will be notified.

## The package name is fixed

`com.assnuew.app` is baked into the Firebase registration above. Changing it
later means re-registering the app with Firebase and re-issuing
`google-services.json`, so it is worth not changing.
