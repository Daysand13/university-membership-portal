# Mentorship calls

How a student and their mentor talk on the portal, what limits exist and
where they come from, and how to turn on the setup with no limits at all.

## Why calls were cutting out

The portal itself never limited how long a call could last. What it did do
was **only open a session's call from 15 minutes before to 3 hours after the
booked time**. That window has been removed.

The cut-off people noticed came from the meeting service. Calls ran on the
free public Jitsi server, **meet.jit.si**, embedded in the portal page.
Since May 2023, meet.jit.si **ends any call embedded in another website after
five minutes**, with a message saying embedding is for demos only. Nothing
in the portal could change that.

## What happens now

| Meeting service | How the call works | Time limit |
| --- | --- | --- |
| **Jitsi as a Service (8x8)**, once set up | Inside the portal. Only the two people in the mentorship can get in. The mentor runs the room. | None from the portal or from 8x8 |
| **The association's own Jitsi server** (its address in Site Settings → Meeting Service) | Inside the portal | None, unless that server is set to have one |
| **meet.jit.si** (the default) | Opens on meet.jit.si in a new tab, because embedded calls there stop at five minutes | None for calls on meet.jit.si itself. The first person in may be asked to sign in with a Google, GitHub or Facebook account. That is meet.jit.si's rule for starting a room. |

So calls are no longer cut off whichever service is used. The portal still
does not promise "unlimited" calls on meet.jit.si: it is a free public
service, and its owners can change its rules.

## Switching on Jitsi as a Service (recommended)

**Done on 26 November 2026.** The live site uses JaaS:

- App ID: `vpaas-magic-cookie-2d2904be88e04901b79d67b8ecedcfd1`
- API key "ASSN portal (Vercel)", Key ID `.../5c871c`
- **"Allow meeting participants to join unauthenticated" is off**, so a
  meeting refuses anybody without a pass the site signed. This was tested:
  a pass signed by the site's code joined; joining without one was refused
  with "Authentication required".

The private key is in Vercel as a secret. If it is ever lost or leaked,
add a new key in the JaaS console under API Keys, put the new Key ID and
private key in Vercel, redeploy, then remove the old key there.

The steps below are how it was set up, for doing it again.

This needs an account in the association's name, which only the association
can create.

1. Sign up at **jaas.8x8.vc** with the association's email address.
2. Under **API Keys**, press **Add API key** and let it generate a key pair.
   Download the private key. It is shown only once.
3. In the Vercel project, under **Settings → Environment Variables**, add:
   - `JAAS_APP_ID`: the App ID shown in the console (`vpaas-magic-cookie-…`)
   - `JAAS_API_KEY_ID`: the new key's ID (`vpaas-magic-cookie-…/…`)
   - `JAAS_PRIVATE_KEY`: the private key file's contents. Line breaks can be
     typed as `\n`.
4. Redeploy. Calls move to 8x8 straight away. Nothing else changes.

**Cost, at the time of writing (November 2026):** the free plan covers 25
monthly active users, meaning people who join at least one call in a month,
with no limit on minutes. Above that, plans are priced per monthly active
user. Check jaas.8x8.vc's pricing page before relying on these figures.
Twenty-five people is about twelve active mentorships a month. If the
programme grows past that, the choices are a paid JaaS plan or the
association's own Jitsi server (free software, but someone has to run a
server).

**What the pass does.** The server signs a pass for each person for that one
mentorship's room, valid for eight hours to get in. Nobody without a pass
can join, even if they learn the room's name. The pass:

- makes the mentor the room's moderator;
- turns off recording, live streaming and transcription;
- carries no email address.

## What a call can do

| | Computer (Chrome, Edge, Firefox, Safari) | Android phone or tablet browser |
| --- | --- | --- |
| Voice only, or voice and video | Yes | Yes |
| Microphone and camera on and off | Yes | Yes |
| Choose the microphone, speaker and camera | Yes. Choosing the speaker needs Chrome or Edge. | Microphone and camera |
| Share the screen | Yes: whole screen, a window, or (Chrome and Edge) one browser tab | **No.** Phone browsers don't let websites share the screen. |
| Chat during the call | Yes. Chat isn't kept after the call; the conversation page is for anything to keep. | Yes |
| Raise hand, tile view, full screen | Yes | Yes. Full screen depends on the browser. |
| Reduce background noise | Yes | Yes, where the browser supports it |
| Waiting room, let in or turn away | Mentor, on JaaS or the association's own server | Same |
| Picture-in-picture | No. A call embedded in a page can't be popped out. | No |

Screen sharing on a Mac also needs the browser to have **Screen Recording**
permission (System Settings → Privacy & Security → Screen Recording). The
browser asks the first time.

## Accessibility

Jitsi draws its own toolbar inside the call. That toolbar sits in a frame
belonging to another site, so a screen reader meets it as unlabelled icons.
The portal therefore puts its own controls under the call:

- **Real buttons.** Each has a fixed name ("Microphone", "Camera", "Share
  screen"…) and an on/off state that NVDA, JAWS, Narrator, TalkBack and
  VoiceOver read as *pressed* or *not pressed*.
- **Live announcements** for:
  - joining, and who else is in the call;
  - someone joining or leaving;
  - a new chat message;
  - someone waiting to be let in;
  - a raised hand;
  - your microphone or camera turning on or off;
  - screen sharing starting or stopping;
  - the connection dropping and coming back.
- **A visible banner** whenever you are sharing your screen, with a Stop
  sharing button.
- **Voice only** is a first-class choice before joining. Nothing switches on
  until Join is pressed, and the browser asks before using the microphone or
  camera.
- **Device choices** are ordinary labelled drop-downs.

## Being called, and remembering

- **Starting a call.** Starting one, from "Call …" on the conversation page,
  tells the other person straight away: a phone notification if they use the
  app, and an email, each with a link into the call. Someone who drops out
  and rejoins within ten minutes doesn't set the other person's phone off
  again.
- **Joining.** The conversation page shows when the other person is in a
  call waiting, with a Join button.
- **Call history.** Each conversation lists its recent calls: when, who
  called, voice or video, and how long they talked, or that nobody answered.
  Nothing said in a call is recorded.
- **Reminders.** On the morning of a booked session, both people get an
  email reminder, sent once. This runs from Vercel Cron at 06:00 Ghana time
  (`vercel.json`, `/api/cron/mentorship-reminders`). Set a `CRON_SECRET` in
  Vercel so only Vercel can trigger it.

## How the record works

Each side's call page checks in every 45 seconds. A person is in the call
from their first check-in until they press **Leave**, or, if their browser
simply closes, until two minutes after their last check-in. The call is on
while either of them is in it. When neither is, it ended at the last
check-in. A call counts as answered once both have been in it at the same
time.

Each side only reports on itself. The page never asks Jitsi whether the
other person is still there, because a browser closing a call can report
everyone leaving at once. See `src/lib/mentorship-call.ts` and the
`mentorship_calls` table.

## Not built yet

- **Sending files during a call.** Use the conversation page. It doesn't
  take attachments yet either.
- **Calls inside the Android app.** The phone notification opens the call in
  the browser.
