"use strict";

const { app, BrowserWindow, globalShortcut, ipcMain, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");

const { BallotQueue } = require("./lib/queue");
const { ServerClock } = require("./lib/clock");
const { CountdownAnnouncer } = require("./lib/announcements");
const { createPortalClient, OfflineError } = require("./lib/portal");

/**
 * ASSN Ballot — the desktop process.
 *
 * Everything that must not be within a voter's reach lives here: the
 * terminal's key, the line to the portal, the queue of votes waiting to be
 * sent. The window it opens shows a ballot and nothing else, and talks to
 * this process through a handful of named messages (see preload.js).
 */

const SCHEDULE_POLL_MS = 30_000;
const QUEUE_FLUSH_MS = 20_000;

let window = null;
let portal = null;
let config = null;
let queue = null;
const clock = new ServerClock();
const announcer = new CountdownAnnouncer();

/** Mirrors CONNECTION in renderer/screen.js. */
const CONNECTION = { UNKNOWN: "unknown", CONNECTED: "connected", OFFLINE: "offline", REJECTED: "rejected" };

let state = {
  configured: false,
  connection: CONNECTION.UNKNOWN,
  /** What the terminal was set up with, minus the key. */
  station: null,
  election: null,
  positions: [],
  queued: 0,
  msRemaining: null,
  lastError: null,
};

// --- What the terminal was set up with -------------------------------------

function configPath() {
  return path.join(app.getPath("userData"), "station.json");
}

/**
 * The station key is kept the way the operating system keeps secrets, when
 * it offers to — Keychain on macOS, DPAPI on Windows. Where it doesn't,
 * the file is written plainly and the setup screen says so, because a key
 * somebody believes is protected when it isn't is worse than one they know
 * to guard.
 */
async function loadConfig() {
  try {
    const raw = JSON.parse(await fs.readFile(configPath(), "utf8"));
    let stationKey = raw.stationKey ?? "";
    if (raw.encrypted && safeStorage.isEncryptionAvailable()) {
      stationKey = safeStorage.decryptString(Buffer.from(raw.stationKey, "base64"));
    }
    return { ...raw, stationKey };
  } catch (err) {
    // Not having been set up yet is the ordinary case, and needs no
    // comment. Anything else is worth saying out loud, because the
    // terminal will otherwise ask for its key again and nobody standing
    // at it will know why.
    if (err.code === "ENOENT") return null;
    console.error("[ballot] could not read the saved terminal settings:", err.message);

    // A key this machine can no longer decrypt is not a key: it would
    // fail again on every restart. Better to clear it and ask once than
    // to keep a file nobody can read.
    await fs.rm(configPath(), { force: true }).catch(() => undefined);
    return null;
  }
}

async function saveConfig({ portalUrl, stationCode, stationKey }) {
  const encrypted = safeStorage.isEncryptionAvailable();
  await fs.writeFile(
    configPath(),
    JSON.stringify(
      {
        portalUrl,
        stationCode,
        stationKey: encrypted ? safeStorage.encryptString(stationKey).toString("base64") : stationKey,
        encrypted,
      },
      null,
      2,
    ),
    "utf8",
  );
  return { portalUrl, stationCode, stationKey, encrypted };
}

function startPortal(cfg) {
  config = cfg;
  portal = createPortalClient({
    baseUrl: cfg.portalUrl,
    stationCode: cfg.stationCode,
    stationKey: cfg.stationKey,
  });
  state.configured = true;
  // The address and the code go back to the screen so the setup form can
  // offer them again if the key turns out to be wrong. The key does not.
  state.station = { portalUrl: cfg.portalUrl, stationCode: cfg.stationCode };
}

// --- Telling the window what is going on -----------------------------------

function publish(extra = {}) {
  state = { ...state, ...extra };
  if (window && !window.isDestroyed()) window.webContents.send("ballot:state", state);
}

function say(clip) {
  if (!clip) return;
  if (window && !window.isDestroyed()) window.webContents.send("ballot:say", clip);
  if (clip === "election_ended") closeDownForTheDay();
}

/**
 * Closing time.
 *
 * The last queued papers go over, the terminal locks itself, and a minute
 * later it leaves kiosk mode — a minute rather than at once, because the
 * commission adding ten more minutes thirty seconds after the bell is
 * exactly the sort of thing that happens, and a terminal that had already
 * shut down would have to be restarted by hand in every hall.
 */
function closeDownForTheDay() {
  flushQueue().catch(() => undefined);
  setTimeout(async () => {
    if (state.election && state.election.phase === "OPEN") return;
    await flushQueue().catch(() => undefined);
    app.exit(0);
  }, 60_000);
}

// --- The two loops ---------------------------------------------------------

async function pollSchedule() {
  if (!portal) return;
  try {
    const schedule = await portal.getSchedule();
    clock.sync(schedule.serverTime);
    const election = schedule.election;
    const msRemaining =
      election && election.phase === "OPEN" ? Math.max(0, clock.msUntil(election.closesAt) ?? 0) : null;

    // An extension after closing time brings the later milestones back.
    const wasClosed = state.election && state.election.phase !== "OPEN";
    if (wasClosed && election && election.phase === "OPEN") {
      say(announcer.reopen(msRemaining));
    } else {
      say(announcer.tick(msRemaining));
    }

    publish({ connection: CONNECTION.CONNECTED, election, msRemaining, lastError: null });

    // The paper itself is fetched once per election and kept, so a hall
    // that loses its line can carry on from what it already holds.
    if (election && (!state.positions.length || state.ballotFor !== election.id)) {
      const paper = await portal.getBallotPaper();
      publish({ positions: paper.positions ?? [], ballotFor: election.id });
    }
  } catch (err) {
    if (err instanceof OfflineError) {
      publish({ connection: CONNECTION.OFFLINE });
    } else if (err.name === "StationRejectedError") {
      // The portal answered and will not have this terminal. That is not
      // a network problem and must not be shown as one: the officer is
      // sent back to the setup form to put the code and key right.
      publish({ connection: CONNECTION.REJECTED, lastError: err.message });
    } else {
      publish({ connection: CONNECTION.OFFLINE, lastError: err.message });
    }
  }
}

async function flushQueue() {
  if (!portal || !queue) return;
  const waiting = await queue.all();
  publish({ queued: waiting.length });
  if (waiting.length === 0) return;

  for (const entry of waiting) {
    try {
      const result = await portal.castVote(entry);
      // Recorded, already on the roll, or refused outright — in all three
      // cases there is nothing further this paper can become.
      if (result.httpStatus === 200 || result.httpStatus === 422) {
        await queue.remove(entry.clientRef);
      }
    } catch (err) {
      if (err instanceof OfflineError) break; // still down; try again later
      publish({ lastError: err.message });
      break;
    }
  }
  publish({ queued: await queue.size() });
}

// --- Messages from the window ----------------------------------------------

function registerHandlers() {
  ipcMain.handle("ballot:getState", async () => state);

  ipcMain.handle("ballot:configure", async (_event, { portalUrl, stationCode, stationKey }) => {
    const candidate = {
      portalUrl: String(portalUrl || "").trim().replace(/\/+$/, ""),
      stationCode: String(stationCode || "").trim().toUpperCase(),
      stationKey: String(stationKey || "").trim(),
    };

    // Tried before it is kept. A key that was mistyped must never reach
    // the disk: the terminal would come back to it on every restart and
    // there would be nothing the officer standing at it could do.
    try {
      await createPortalClient({
        baseUrl: candidate.portalUrl,
        stationCode: candidate.stationCode,
        stationKey: candidate.stationKey,
      }).getSchedule();
    } catch (err) {
      if (err.name === "StationRejectedError") {
        return {
          ok: false,
          error: `The portal does not accept ${candidate.stationCode} with that key. Check both with the Electoral Commission — the key is the one issued with this terminal's code.`,
        };
      }
      return {
        ok: false,
        error: `Could not reach ${candidate.portalUrl}. Check the address and this machine's internet connection.`,
      };
    }

    const cfg = await saveConfig(candidate);
    startPortal(cfg);
    publish({ connection: CONNECTION.CONNECTED, lastError: null });
    await pollSchedule();
    await flushQueue();
    return { ok: true, encrypted: cfg.encrypted };
  });

  ipcMain.handle("ballot:verify", async (_event, indexNumber) => {
    if (!portal) return { ok: false, status: "NOT_CONFIGURED" };
    try {
      const outcome = await portal.verify(String(indexNumber || "").trim());
      return outcome ?? { ok: false, status: "UNREADABLE" };
    } catch (err) {
      if (err instanceof OfflineError) {
        // Verification is the one thing that cannot be done from a queue:
        // whether somebody has already voted is only known centrally.
        return { ok: false, status: "OFFLINE" };
      }
      return { ok: false, status: "ERROR", error: err.message };
    }
  });

  ipcMain.handle("ballot:cast", async (_event, { token, choices }) => {
    if (!portal || !queue) return { status: "NOT_CONFIGURED" };
    const entry = { clientRef: `${config.stationCode}-${randomUUID()}`, token, choices };
    try {
      const result = await portal.castVote(entry);
      if (result.httpStatus === 200) {
        publish({ connection: CONNECTION.CONNECTED });
        // RECORDED, or ALREADY_VOTED if they voted at another terminal
        // while this one was thinking about it.
        return { status: result.status };
      }
      if (result.httpStatus === 422) return { status: "REFUSED", reason: result.reason || result.error };
      return { status: "ERROR" };
    } catch (err) {
      if (!(err instanceof OfflineError)) return { status: "ERROR", error: err.message };
      // The line is down and there is somebody standing at the machine.
      // Their vote is kept and sent when it comes back.
      await queue.add(entry);
      publish({ queued: await queue.size(), connection: CONNECTION.OFFLINE });
      return { status: "QUEUED" };
    }
  });

  ipcMain.handle("ballot:quit", async (_event, key) => {
    // Leaving kiosk mode takes the terminal's own key, so a voter cannot
    // walk out of the ballot into the desktop. Before the terminal has
    // been set up there is no key and nothing to protect — and somebody
    // has to be able to close a window that fills the screen.
    if (config && String(key || "").trim() !== config.stationKey) return { ok: false };
    await flushQueue();
    app.exit(0);
    return { ok: true };
  });
}

// --- The window ------------------------------------------------------------

function createWindow() {
  // A terminal in a hall is locked full-screen with no way back to the
  // desktop. Somebody trying the application out on their own laptop
  // wants an ordinary window they can close — ASSN_BALLOT_WINDOWED=1.
  const windowed = process.env.ASSN_BALLOT_WINDOWED === "1";

  window = new BrowserWindow({
    kiosk: !windowed,
    fullscreen: !windowed,
    frame: windowed,
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    backgroundColor: "#0B1B3A",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Nothing here loads a web page: the renderer is local files and the
      // only network traffic is this process talking to the portal.
      sandbox: true,
      spellcheck: false,
    },
  });

  window.loadFile(path.join(__dirname, "renderer", "index.html"));
  window.on("closed", () => {
    window = null;
  });
}

app.whenReady().then(async () => {
  // Before anything can open a window and ask: a page that loads while
  // these are still being registered gets an error instead of a state,
  // and then renders nothing at all.
  registerHandlers();

  queue = new BallotQueue(path.join(app.getPath("userData"), "queued-ballots.json"));
  await queue.load();

  const saved = await loadConfig();
  if (saved && saved.portalUrl && saved.stationCode && saved.stationKey) startPortal(saved);

  createWindow();

  // Whatever the startup checks have worked out by the time the page is
  // ready, the page is told. Without this, everything published while it
  // was still loading is simply lost.
  window.webContents.on("did-finish-load", () => publish());

  // A voter must not be able to open the developer tools, reload into a
  // half-finished state, or print the ballot.
  for (const accelerator of ["CommandOrControl+R", "F5", "CommandOrControl+Shift+I", "F12", "CommandOrControl+P"]) {
    globalShortcut.register(accelerator, () => undefined);
  }

  publish({ queued: await queue.size() });
  await pollSchedule();
  await flushQueue();

  setInterval(pollSchedule, SCHEDULE_POLL_MS);
  setInterval(flushQueue, QUEUE_FLUSH_MS);
  // The countdown is announced from the schedule poll, but the clock has
  // to be watched more closely than every thirty seconds to catch a
  // milestone at the right minute.
  setInterval(() => {
    if (!state.election || state.election.phase !== "OPEN") return;
    const msRemaining = Math.max(0, clock.msUntil(state.election.closesAt) ?? 0);
    say(announcer.tick(msRemaining));
    publish({ msRemaining });
  }, 5_000);

});

app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => globalShortcut.unregisterAll());
