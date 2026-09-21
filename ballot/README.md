# ASSN Ballot

The polling terminal. It runs on the workstations at the polling centres
on election day, in locked full-screen kiosk mode, and talks to the
association's portal over four endpoints.

It is a separate application from the website in the folder above, with its
own `package.json` and its own release. Nothing in here is deployed to
Vercel.

```
npm install
npm start          # run it on this machine
npm test           # the queue, the countdown, the clock, the portal client
npm run package    # a Windows installer, into dist/
```

## Setting up a terminal

1. In the portal, under **Elections → Polling Terminals**, register the
   workstation. You get a code (`LIB-1`) and a key, shown once.
2. Install ASSN Ballot on the workstation and start it.
3. Type in the portal address, the code and the key. The key is stored the
   way the operating system stores secrets — Keychain, DPAPI — and the
   setup screen says so if it couldn't be.

That is the whole of the configuration. The terminal then follows whatever
the commission does in the portal: opening times, extensions,
postponements, the ballot paper itself.

## What happens on the day

- **A voter enters their index number.** The terminal asks the portal, which
  answers one of four things: verified, not registered, dues unpaid, already
  voted. Each has its own spoken announcement and its own words on screen.
- **A verified voter gets one post at a time** — a `fieldset` per post,
  a radio per candidate, number keys to choose, and the option to skip any
  post. Their choices are read back before anything is submitted.
- **The paper goes to the portal.** If the line is down it is written to
  disk and sent when the line comes back; the voter is told plainly that
  their vote is kept and will count. Every paper carries a reference the
  portal uses to recognise a second delivery, so nothing is counted twice.
- **The terminal announces the time left** at two hours, one hour, forty,
  thirty, twenty, ten, five and two minutes. A terminal switched on late
  does not recite the announcements it missed.
- **At closing time** it says so, sends anything still queued, locks, and a
  minute later leaves kiosk mode — a minute, not instantly, because the
  commission adding ten more minutes just after the bell is exactly the sort
  of thing that happens.

The officer leaves kiosk mode with **Ctrl+Shift+Q** and the terminal's key.
A voter cannot: reload, developer tools and printing are all disabled.

## How it is put together

| File | What it is |
| --- | --- |
| `src/main.js` | The desktop process: the window, the key, the two loops |
| `src/preload.js` | The only door between the page and the process — five messages |
| `src/lib/portal.js` | The line to the portal; tells a refusal from a dead line |
| `src/lib/queue.js` | Votes waiting for the line to come back |
| `src/lib/clock.js` | The portal's time, for workstations whose clock is out |
| `src/lib/announcements.js` | Which countdown announcement is due |
| `src/renderer/` | What a voter sees; no network, no key, no file access |
| `assets/audio/` | The recordings, and the scripts for them |

The station key never reaches the renderer. Everything on the network is
done by the desktop process.

## What is not built

- **Fingerprint readers.** The portal has no biometric enrolled for anybody,
  so there would be nothing to check a print against. The place it would
  go is the verification step in `src/renderer/app.js`, alongside the index
  number, and it would need an enrolment flow in the portal first.
- **A live socket to the portal.** The terminals ask every thirty seconds
  instead. The portal runs on serverless functions, which cannot hold a
  socket open, and a hall with fluctuating internet drops a socket
  constantly — a short poll that carries the server's own time is both
  simpler and steadier. An extension reaches every terminal within half a
  minute.
