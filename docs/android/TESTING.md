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

### 1. It opens on the welcome screen, and signing in lands on the dashboard

Signed out, the app shows **Welcome**, with Sign in and Join — nothing else.
Sign in, and it should go **straight to Home**, with your name at the top
and News, Events and More along the bottom. Sign out from More, and it
should go straight back to Welcome.

Sign in **as somebody who is both a student and a graduate**, and choose a
portal. This is the path that twice landed people back on a signed-out
screen; the cause was the app talking to the bare domain, which redirects,
and the redirect dropping the sign-in token from every request. If it
happens again, that is the first thing to check.

Then **an alumni account**. Most active alumni have no `User` row at all;
they exist only as alumni records. The app's sign-in falls back to
authenticating them directly, and that fallback is only exercised by an
alumni login.

### 2. Every tab loads

Home, News, Events, More. Then open one news item and one event from its
list — the lists and the detail screens fetch separately, so a list
appearing proves less than it looks.

Then the shortcuts on Home: Announcements, Dues, Directory, Library,
Elections. Elections is view-only by design; there is no voting in the app.

### 3. Joining

Each form creates a **real record on the live site** — an application in
the membership queue, a patron waiting for approval, an alumni account. So
do not fill one in with made-up details to see if it works. Either watch a
real new member use it, or fill one in and then delete it in **Admin**
straight afterwards.

What is worth watching on the student form:

- **The passport photo from the camera.** It should show the photo and say
  "Attached". A camera photo is several megabytes; the app shrinks it first.
- **The medical report from a saved PDF**, and from a photo of a paper one.
- **Leave a box empty and send.** The message beside the button should name
  the boxes that need fixing, and each box should have its own message
  under it.
- **Take a photo, then come back.** On a phone short of memory Android may
  close the app behind the camera; what you typed should still be there.

An alumni sign-up should go straight to that person's dashboard.

### 4. The accessibility buttons

At the top right of **every** screen: the speaker (Read Aloud) and the text
button (Display).

- **Read Aloud** on a form: it should say each box with its name and state —
  "First name, text box, empty." — and each button as a button. Press again
  to stop. Moving to another screen should stop it too.
- **Display**: try **Larger** text, then **High contrast**, then **Dark
  mode**, on a couple of screens and on the sign-up form. Nothing should be
  cut off, and every word should still be readable. The choice should still
  be there after closing and reopening the app.
- With **TalkBack** on (Settings → Accessibility), swipe through one form.
  Every control should be announced with what it is and what it says.

### 5. Turn off wifi and mobile data, then reopen

The app should say it is offline, not show a blank screen or spin forever.
Turn the connection back on and check it recovers without a restart.

### 6. A notification, on the next real news post

This one needs care. Publishing a piece of news to test it puts a junk
record on the live site that every member can see, so **do not invent
one** — wait for the next news item or event you were going to publish
anyway, and watch the phone when you press Publish.

Keep the app in the background, not open, when you do. A notification that
only arrives while the app is on screen means the phone was never
registered, which is the failure worth catching.

If nothing arrives: it is almost always the Firebase service account in the
website's environment variables rather than the app.

### 7. The self-update flow

The app checks **Admin → App Releases** on startup, and offers anything
newer than itself. Nothing is recorded there yet, so it has never offered
an update — worth testing on purpose rather than assuming it works.

With an older build installed on the phone, record the newer one there
(its address, SHA-256 and size), publish it, and reopen the app. It should
offer the update, download it with a progress figure, and hand it to
Android to install over the top.

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
