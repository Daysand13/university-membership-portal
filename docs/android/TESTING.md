# Testing a build before it goes round

Twenty minutes with any Android phone. Do this before the link reaches
the association, because the app is not on Google Play: a broken build is
not fixed by a store update, it is fixed by asking everybody to uninstall
and install again by hand.

## Getting it onto the phone

Scan the QR code the build printed, or open the build link in the phone's
browser. Either downloads the APK directly.

Android will warn about **installing from unknown sources**, and will
probably make you turn on a permission for the browser first. That is
normal for an app outside Google Play, and it is worth saying so when you
send the link round — otherwise it reads as a virus warning and people
stop.

**First check:** open the **More** tab and scroll to the bottom. A
production build shows nothing there. If it names an environment, you have
installed a staging or development build by mistake.

---

## What is worth actually checking

In rough order of how likely it is to be broken and how much it costs if it
is.

### 1. Signing in — and sign in as an alumnus

Members first, then **an alumni account**. This is the one to not skip.

Most active alumni have no `User` row at all; they exist only as alumni
records. The app's sign-in falls back to authenticating them directly, and
that fallback is only exercised by an alumni login. If it regresses, the
website keeps working and the app locks those people out with what looks
like a wrong password.

### 2. Every tab loads

News, Events, Portal, More. Then open one news item and one event from its
list — the lists and the detail screens fetch separately, so a list
appearing proves less than it looks.

Then the screens behind More: Announcements, Dues, Directory, Library,
Elections. Elections is view-only by design; there is no voting in the app.

### 3. Turn off wifi and mobile data, then reopen

The app should say it is offline, not show a blank screen or spin forever.
Turn the connection back on and check it recovers without a restart.

### 4. A notification, on the next real news post

This one needs care. Publishing a piece of news to test it puts a junk
record on the live site that every member can see, so **do not invent
one** — wait for the next news item or event you were going to publish
anyway, and watch the phone when you press Publish.

Keep the app in the background, not open, when you do. A notification that
only arrives while the app is on screen means the phone was never
registered, which is the failure worth catching.

If nothing arrives: it is almost always the Firebase service account in the
website's environment variables rather than the app.

### 5. The self-update flow

Cannot be tested yet, and it is worth knowing why rather than assuming it
works.

The app checks for a newer build on startup, and there is only one build.
The flow becomes testable the moment a second release is recorded in
**Admin → App Releases** — at which point this first APK should offer to
update itself. Check it then, on the same borrowed phone if you can.

---

## If something fails

Note which screen and what it said. The app reports server errors plainly
rather than swallowing them, so the message is usually the diagnosis.

Anything that needs a code change needs a new build and a new APK, so it is
worth finishing the whole list and collecting every problem before
rebuilding, rather than going round once per fault.

---

## A note on `eas.json`

The `staging` profile points at `https://staging.assnuew.com`, which does
not currently resolve. A staging build would install and then fail to reach
anything, which reads as a broken app rather than a missing host. Either
point that profile somewhere real or leave it alone — but do not hand a
staging build to a tester expecting it to work.
