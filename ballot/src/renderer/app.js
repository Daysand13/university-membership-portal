"use strict";

import {
  announce,
  configure as configureVoice,
  forgetRecordings,
  getStatus as voiceStatus,
  onStatus as onVoiceStatus,
  repeatLast,
  speakPrivately,
  stopPrivate,
} from "./audio.js";
import { announcementForCheckIn } from "./voice-policy.js";
import { CONNECTION, chooseScreen, connectionLabel } from "./screen.js";

/**
 * The ballot as a voter meets it.
 *
 * One thing on the screen at a time, in the order it happens: enter your
 * index number, choose for each post in turn, read it back, confirm. The
 * terminal says each step aloud, and every step is ordinary HTML — a
 * fieldset per post, a radio per candidate — so a screen reader announces
 * it without any help from us.
 */

const el = (id) => document.getElementById(id);
const screens = ["setup", "welcome", "locked", "identity", "ballot", "review", "done"];

const RESET_AFTER_MS = 5000;

let state = { configured: false, positions: [], election: null };
let session = null; // { token, voter, choices, index }
let resetTimer = null;

function show(name) {
  for (const screen of screens) {
    el(`screen-${screen}`).hidden = screen !== name;
  }
  const first = el(`screen-${name}`).querySelector("input, button");
  if (first) first.focus();
}

function live(message) {
  el("live").textContent = message;
}

// --- What the desktop process tells us -------------------------------------

function render(next) {
  const previousVoice = state.voice;
  state = { ...state, ...next };

  // New speaker settings from the desktop process: the speakers are
  // re-checked, and a different voice means fetching new recordings.
  if (state.voice && state.voice !== previousVoice) {
    if (previousVoice && previousVoice.voiceId !== state.voice.voiceId) forgetRecordings();
    configureVoice(bridge, state.voice);
  }

  el("connection").textContent = connectionLabel(state.connection, state.queued);
  el("connection").classList.toggle("warn", state.connection !== CONNECTION.CONNECTED);
  el("election-title").textContent = state.election ? state.election.title : "";

  const logo = state.association && state.association.logoDataUri;
  for (const id of ["brand-logo", "setup-logo"]) {
    const img = el(id);
    if (logo) img.src = logo;
    img.hidden = !logo;
  }
  if (state.association && state.association.name) {
    el("association-name").textContent = state.association.name;
    el("brand-logo").alt = `${state.association.name} logo`;
    el("setup-logo").alt = `${state.association.name} logo`;
  }
  el("officer-station").textContent = state.station ? state.station.stationCode : "not set up";
  el("queued").textContent = state.queued ? `${state.queued} waiting to be sent` : "";

  const remaining = state.msRemaining;
  el("countdown").textContent =
    remaining === null || remaining === undefined ? "" : `${Math.ceil(remaining / 60000)} min left`;

  // Somebody standing at the machine with a half-finished ballot keeps it.
  const chosen = chooseScreen(state, Boolean(session));
  if (session && chosen.screen === "ballot") return;

  if (chosen.screen === "setup") {
    // A terminal the portal has refused comes back here with the address
    // and code it had, so only the key has to be typed again.
    if (state.station) {
      el("portalUrl").value = el("portalUrl").value || state.station.portalUrl || "";
      el("stationCode").value = el("stationCode").value || state.station.stationCode || "";
    }
    if (chosen.message) el("setup-error").textContent = chosen.message;
    show("setup");
    return;
  }

  if (chosen.screen === "locked") {
    el("locked-heading").textContent = chosen.heading;
    el("locked-message").textContent = chosen.message;
    show("locked");
    return;
  }

  // "Thank you for voting" holds for its few seconds before the reset.
  if (!session && el("screen-welcome").hidden && el("screen-done").hidden) show("welcome");
}

// --- Checking a voter in ---------------------------------------------------

async function handleIndexSubmit(event) {
  event.preventDefault();
  const input = el("indexNumber");
  const error = el("verify-error");
  error.textContent = "";

  const outcome = await bridge.verify(input.value);

  // The hall hears whether this person may vote, and nothing else about
  // them: unpaid dues, for one, are their own business.
  announce(announcementForCheckIn(outcome.status));

  if (outcome.status === "VERIFIED") {
    session = { token: outcome.token, voter: outcome, choices: [], index: 0 };
    input.value = "";
    showIdentity(outcome);
    return;
  }

  const written = {
    INVALID_INDEX: "That index number is not registered. Speak to the Electoral Commission officer.",
    DUES_UNPAID: "Your dues for this academic year are not paid, so you cannot vote in this election.",
    ALREADY_VOTED: "Our records show you have already voted in this election.",
    VOTING_CLOSED: "Voting is not open at the moment.",
    OFFLINE: "This terminal cannot reach the portal, so it cannot check you in. Tell the officer.",
    ERROR: "Something went wrong checking that number. Tell the officer.",
  }[outcome.status] ?? "That number could not be checked. Tell the officer.";

  error.textContent = written;
  live(written);
  input.select();
}

/**
 * The officer's check, between the keypad and the ballot paper.
 *
 * An index number proves somebody knows an index number. The photograph
 * and the name are what tell the officer standing there that the person in
 * front of them is the person it belongs to — which is the only moment in
 * the whole day when that can be caught.
 *
 * Nothing about anybody's health or support needs appears here. It is a
 * screen in a crowded hall.
 */
function showIdentity(voter) {
  const photo = el("voter-photo");
  const missing = el("voter-photo-missing");
  if (voter.photoUrl) {
    photo.src = voter.photoUrl;
    photo.alt = `Photograph of ${voter.fullName}`;
    photo.hidden = false;
    missing.hidden = true;
    // A photo that will not load is worse than none: it looks like the
    // record is wrong rather than that the picture is missing.
    photo.onerror = () => {
      photo.hidden = true;
      missing.hidden = false;
    };
  } else {
    photo.hidden = true;
    missing.hidden = false;
  }

  el("voter-name").textContent = voter.fullName;
  el("voter-index").textContent = voter.indexNumber;
  el("voter-programme").textContent = voter.programme;
  el("voter-level").textContent = voter.level;
  el("voter-campus").textContent = voter.campus;

  show("identity");
  const spoken = `${voter.fullName}, index number ${voter.indexNumber}, ${voter.programme}, level ${voter.level}.`;
  // Who this is stays private — the hall has already heard only that
  // verification succeeded.
  speakPrivately(`Please check the photograph. ${spoken}`);
  live(spoken);
}

// --- The ballot ------------------------------------------------------------

function renderPosition() {
  const position = state.positions[session.index];
  if (!position) return renderReview();

  el("ballot-progress").textContent = `Post ${session.index + 1} of ${state.positions.length}`;
  el("position-title").textContent = position.title;

  const container = el("candidates");
  container.innerHTML = "";

  // Only one person standing: the question is whether to have them, not
  // which of them. Offering a list of one and calling it a choice would
  // be a pretence, and it would make a no impossible to express.
  if (position.unopposed && position.candidates.length === 1) {
    renderYesNo(position, container);
    return;
  }

  position.candidates.forEach((candidate, i) => {
    const id = `candidate-${candidate.id}`;
    const label = document.createElement("label");
    label.className = "candidate";
    label.htmlFor = id;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "candidate";
    input.id = id;
    input.value = candidate.id;

    const number = document.createElement("span");
    number.className = "number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(i + 1);

    const text = document.createElement("span");
    text.className = "candidate-text";
    const name = document.createElement("span");
    name.className = "candidate-name";
    name.textContent = candidate.name;
    text.appendChild(name);
    if (candidate.manifesto) {
      const manifesto = document.createElement("span");
      manifesto.className = "candidate-manifesto";
      manifesto.textContent = candidate.manifesto;
      text.appendChild(manifesto);
    }

    if (candidate.photoUrl) {
      const photo = document.createElement("img");
      photo.src = candidate.photoUrl;
      photo.alt = "";
      photo.className = "candidate-photo";
      label.appendChild(photo);
    }

    label.append(input, number, text);
    container.appendChild(label);
  });

  if (position.candidates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Nobody is standing for this post.";
    container.appendChild(empty);
  }

  show("ballot");
  // Candidates' names: the voter's ears only, never the hall speaker. They
  // are also on screen for a screen reader.
  speakPrivately(
    `${position.title}. ${position.candidates.length} candidate${position.candidates.length === 1 ? "" : "s"}. ` +
      position.candidates.map((c, i) => `${i + 1}. ${c.name}.`).join(" "),
  );
  live(`${position.title}: ${position.candidates.length} standing.`);
}

/**
 * An unopposed post: the candidate, and a straight yes or no.
 *
 * Rendered as two radios rather than two buttons so the whole screen
 * still works the same way as every other post — one mark, then Next —
 * and so a screen reader announces it as the one question it is.
 */
function renderYesNo(position, container) {
  const candidate = position.candidates[0];

  const intro = document.createElement("p");
  intro.className = "hint";
  intro.textContent = `${candidate.name} is standing unopposed. Should they take this post?`;
  container.appendChild(intro);

  if (candidate.photoUrl) {
    const photo = document.createElement("img");
    photo.src = candidate.photoUrl;
    photo.alt = "";
    photo.className = "candidate-photo";
    container.appendChild(photo);
  }

  const name = document.createElement("p");
  name.className = "candidate-name";
  name.textContent = candidate.name;
  container.appendChild(name);

  if (candidate.manifesto) {
    const manifesto = document.createElement("p");
    manifesto.className = "candidate-manifesto";
    manifesto.textContent = candidate.manifesto;
    container.appendChild(manifesto);
  }

  [
    { value: "yes", label: `Yes — ${candidate.name} should take this post` },
    { value: "no", label: `No — ${candidate.name} should not take this post` },
  ].forEach((option, i) => {
    const id = `answer-${option.value}`;
    const label = document.createElement("label");
    label.className = "candidate";
    label.htmlFor = id;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "candidate";
    input.id = id;
    input.value = candidate.id;
    input.dataset.approve = option.value === "yes" ? "true" : "false";

    const number = document.createElement("span");
    number.className = "number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(i + 1);

    const text = document.createElement("span");
    text.className = "candidate-text";
    const line = document.createElement("span");
    line.className = "candidate-name";
    line.textContent = option.value === "yes" ? "Yes" : "No";
    text.appendChild(line);
    const spoken = document.createElement("span");
    spoken.className = "candidate-manifesto";
    spoken.textContent = option.label;
    text.appendChild(spoken);

    label.append(input, number, text);
    container.appendChild(label);
  });

  show("ballot");
  speakPrivately(
    `${position.title}. ${candidate.name} is standing unopposed. Press 1 for yes, 2 for no, or skip this post.`,
  );
  live(`${position.title}: ${candidate.name}, unopposed. Yes or no.`);
}

function recordChoice(candidateId, approve = true) {
  const position = state.positions[session.index];
  session.choices = session.choices.filter((c) => c.positionId !== position.id);
  if (candidateId) session.choices.push({ positionId: position.id, candidateId, approve });
  session.index += 1;
  renderPosition();
}

function renderReview() {
  const list = el("review-list");
  list.innerHTML = "";
  const spoken = [];

  for (const position of state.positions) {
    const choice = session.choices.find((c) => c.positionId === position.id);
    const candidate = position.candidates.find((c) => c.id === choice?.candidateId);

    let answer = "Skipped";
    if (candidate && position.unopposed) {
      answer = choice.approve ? `Yes — ${candidate.name}` : `No — ${candidate.name}`;
    } else if (candidate) {
      answer = candidate.name;
    }

    const dt = document.createElement("dt");
    dt.textContent = position.title;
    const dd = document.createElement("dd");
    dd.textContent = answer;
    if (!candidate) dd.className = "skipped";
    list.append(dt, dd);
    spoken.push(`${position.title}: ${candidate ? answer : "skipped"}.`);
  }

  show("review");
  // The whole ballot, read back: the most private thing the terminal says.
  speakPrivately(`Please check your ballot. ${spoken.join(" ")} Confirm to submit it.`);
}

async function submitBallot() {
  const result = await bridge.cast({ token: session.token, choices: session.choices });

  const messages = {
    RECORDED: "Your vote has been recorded. Thank you.",
    QUEUED: "Your vote has been saved on this terminal and will be sent as soon as the connection returns. It is counted.",
    ALREADY_VOTED: "Our records show a vote has already been cast for you in this election.",
    REFUSED: result.reason || "This ballot could not be accepted. Tell the officer.",
    ERROR: "Something went wrong sending your ballot. Tell the officer before you leave.",
  };

  el("done-heading").textContent =
    result.status === "RECORDED" || result.status === "QUEUED" ? "Thank you for voting" : "Speak to the officer";
  el("done-message").textContent = messages[result.status] ?? messages.ERROR;

  stopPrivate();
  if (result.status === "RECORDED" || result.status === "QUEUED") announce("vote_confirmed");
  else announce("assistance");
  live(el("done-message").textContent);
  show("done");

  // Ready for the next voter, and nothing of the last one left on screen —
  // or still being said in the headphones.
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    session = null;
    stopPrivate();
    render({});
    show(state.election && state.election.phase === "OPEN" ? "welcome" : "locked");
    if (state.election && state.election.phase === "OPEN") announce("welcome");
  }, RESET_AFTER_MS);
}

// --- Setting up ------------------------------------------------------------

async function handleSetup(event) {
  event.preventDefault();
  const error = el("setup-error");
  error.textContent = "Connecting…";
  const result = await bridge.configure({
    portalUrl: el("portalUrl").value,
    stationCode: el("stationCode").value,
    stationKey: el("stationKey").value,
  });
  if (result.ok) {
    error.textContent = "";
    el("stationKey").value = "";
    announce("welcome");
  } else {
    error.textContent =
      result.error || "This terminal could not reach the portal, or the code and key were not accepted.";
  }
}

// --- Wiring ----------------------------------------------------------------

el("setup-form").addEventListener("submit", handleSetup);
el("index-form").addEventListener("submit", handleIndexSubmit);
el("identity-confirm").addEventListener("click", () => {
  if (!session) return;
  announce("eligible");
  live(`${session.voter.firstName}, the ballot is open.`);
  renderPosition();
});

el("identity-reject").addEventListener("click", () => {
  // The slip goes with them. Nothing was cast, and the next person starts
  // from the keypad.
  session = null;
  el("verify-error").textContent = "That index number belongs to somebody else. Check with the officer.";
  show("welcome");
  live("Not the right person. Start again.");
});

el("skip").addEventListener("click", () => recordChoice(null));
el("ballot-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const chosen = el("candidates").querySelector("input[name='candidate']:checked");
  recordChoice(chosen ? chosen.value : null, chosen ? chosen.dataset.approve !== "false" : true);
});
el("review-back").addEventListener("click", () => {
  session.index = 0;
  renderPosition();
});
el("review-confirm").addEventListener("click", submitBallot);

// Number keys choose a candidate: quicker than a mouse for somebody who
// can see, and the only practical way for somebody who can't.
document.addEventListener("keydown", (event) => {
  if (el("screen-ballot").hidden) return;
  if (!/^[1-9]$/.test(event.key)) return;
  const inputs = el("candidates").querySelectorAll("input[name='candidate']");
  const target = inputs[Number(event.key) - 1];
  if (!target) return;
  target.checked = true;
  target.focus();
  const label = target.closest(".candidate").querySelector(".candidate-name");
  // What the voter just chose. Of everything the terminal says, this is the
  // one that must never reach the hall.
  speakPrivately(`Chosen: ${label.textContent}.`);
});

/**
 * The officer's controls: close this terminal, or point it at a different
 * station. One officer often has several machines to see to, and asking
 * them to edit a file in AppData to move one is not a plan.
 */
/** The key, held only while the controls are open. */
let officerKey = "";

function openOfficerPanel() {
  officerKey = "";
  el("officer-error").textContent = "";
  el("officer-key").value = "";
  el("officer-lock").hidden = false;
  el("officer-panel").hidden = true;
  el("officer-dialog").showModal();
  // A terminal nobody has set up yet has no key to ask for.
  if (state.configured) el("officer-key").focus();
  else void unlockOfficerPanel();
}

async function unlockOfficerPanel() {
  const key = el("officer-key").value;
  if (state.configured && !key) {
    el("officer-error").textContent = "Enter this terminal's key.";
    return;
  }
  const result = await bridge.checkKey(key);
  if (!result.ok) {
    el("officer-error").textContent = "That key was not accepted.";
    el("officer-key").select();
    return;
  }
  officerKey = key;
  el("officer-lock").hidden = true;
  el("officer-panel").hidden = false;
  await fillSpeakerControls();
  el("voice-enabled").focus();
}

function closeOfficerPanel() {
  officerKey = "";
  el("officer-key").value = "";
  el("officer-dialog").close();
}

async function terminalAction(run) {
  el("terminal-error").textContent = "";
  const result = await run(officerKey);
  if (result.ok) {
    closeOfficerPanel();
    return;
  }
  el("terminal-error").textContent = result.error || "That could not be done.";
}

/** The officer's view of the speaker: what is chosen, and whether it is working. */
async function fillSpeakerControls() {
  const voice = state.voice ?? {};
  const status = voiceStatus();
  el("voice-enabled").checked = voice.enabled !== false;
  el("voice-headphones").checked = voice.defaultIsHeadphones === true;
  el("voice-volume").value = String(Math.round((voice.volume ?? 0.9) * 100));
  el("voice-volume-value").textContent = `${el("voice-volume").value}%`;

  const device = el("voice-device");
  device.innerHTML = "";
  // A device with no id can't be chosen — browsers hide ids until allowed
  // to list devices — and "default" is exactly what the hall speaker must
  // not be, since that is where the voter's own speech goes.
  const real = status.outputs.filter((o) => o.deviceId && o.deviceId !== "default" && o.deviceId !== "communications");
  const choices = [{ deviceId: "", label: "Choose the hall speaker…" }, ...real];
  if (voice.deviceId && !status.outputs.some((o) => o.deviceId === voice.deviceId)) {
    choices.push({ deviceId: voice.deviceId, label: `${voice.deviceLabel || "The chosen speaker"} (not connected)` });
  }
  for (const output of choices) device.add(new Option(output.label, output.deviceId, false, output.deviceId === (voice.deviceId ?? "")));

  const list = await bridge.voices();
  for (const [id, includeFallbackOnly] of [["voice-voice", false], ["voice-fallback", true]]) {
    const select = el(id);
    select.innerHTML = "";
    const offered = includeFallbackOnly ? list.filter((v) => v.canFillGaps) : list;
    for (const v of offered) {
      const coverage = v.canFillGaps ? "" : ` — ${v.have} of ${v.total} phrases`;
      select.add(new Option(`${v.name}${coverage}`, v.id));
    }
    select.value = (includeFallbackOnly ? voice.fallbackVoiceId : voice.voiceId) ?? select.options[0]?.value ?? "";
  }
  showSpeakerStatus(status);
}

function describeLast(status) {
  if (!status.lastAt) return "Nothing announced yet.";
  const time = status.lastAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return status.lastResult === "played" ? `Last announcement played at ${time}.` : `Last announcement FAILED at ${time}.`;
}

function showSpeakerStatus(status) {
  const pill = el("speaker");
  if (!status.enabled) pill.textContent = "Announcements off";
  else if (!status.speakerConnected) pill.textContent = "Hall speaker not connected";
  else pill.textContent = status.level === "error" ? "Speaker problem — see officer controls" : `Speaker: ${status.speakerName}`;
  pill.classList.toggle("warn", status.enabled && (status.level === "error" || !status.speakerConnected));

  if (!el("officer-panel").hidden) {
    const parts = [
      status.enabled ? `Announcements on, through ${status.speakerName}.` : "Announcements are off.",
      describeLast(status),
      status.message,
    ].filter(Boolean);
    el("voice-status").textContent = parts.join(" ");
    el("voice-status").classList.toggle("warn", status.level !== "ok");
    el("private-status").textContent = status.privateReason;
  }
}

onVoiceStatus(showSpeakerStatus);

async function saveSpeaker() {
  el("voice-error").textContent = "";
  const device = el("voice-device");
  const settings = {
    enabled: el("voice-enabled").checked,
    deviceId: device.value || null,
    deviceLabel: device.value ? device.selectedOptions[0]?.textContent.replace(/ \(not connected\)$/, "") ?? "" : "",
    volume: Number(el("voice-volume").value) / 100,
    voiceId: el("voice-voice").value || null,
    fallbackVoiceId: el("voice-fallback").value || null,
    defaultIsHeadphones: el("voice-headphones").checked,
  };
  const result = await bridge.setVoice(officerKey, settings);
  if (!result.ok) {
    el("voice-error").textContent = result.error || "The speaker settings could not be saved.";
    return false;
  }
  live("Speaker settings saved.");
  return true;
}

el("officer").addEventListener("click", openOfficerPanel);
el("officer-cancel").addEventListener("click", closeOfficerPanel);
el("officer-done").addEventListener("click", closeOfficerPanel);
el("officer-unlock").addEventListener("click", () => void unlockOfficerPanel());
el("officer-key").addEventListener("keydown", (event) => {
  if (event.key === "Enter") void unlockOfficerPanel();
});
el("officer-quit").addEventListener("click", () => terminalAction((key) => bridge.quit(key)));
el("officer-switch").addEventListener("click", () => terminalAction((key) => bridge.reconfigure(key)));
el("voice-volume").addEventListener("input", () => {
  el("voice-volume-value").textContent = `${el("voice-volume").value}%`;
});
el("voice-refresh").addEventListener("click", () => {
  configureVoice(bridge, state.voice);
  setTimeout(() => void fillSpeakerControls(), 300);
});
el("voice-save").addEventListener("click", () => void saveSpeaker());
// The test plays what is chosen on screen, so it is saved first: testing a
// speaker you have not actually selected would prove nothing.
el("voice-test").addEventListener("click", async () => {
  if (await saveSpeaker()) setTimeout(() => void announce("test", { force: true }), 200);
});
el("voice-repeat").addEventListener("click", async () => {
  if (!(await repeatLast())) el("voice-error").textContent = "There is no announcement to repeat yet.";
});
el("officer-dialog").addEventListener("close", () => {
  officerKey = "";
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "q") openOfficerPanel();
});

/**
 * Opened as a plain page rather than inside the desktop shell — somebody
 * checking the wording or the contrast in a browser. There is no terminal
 * behind it, so it shows itself with sample content instead of a blank
 * screen and refuses to pretend it took a vote.
 */
const bridge = window.ballot ?? {
  getState: async () => ({
    configured: true,
    online: true,
    queued: 0,
    msRemaining: 3_600_000,
    election: { id: "sample", title: "Sample election — preview only", phase: "OPEN", closesAt: null, notice: null },
    positions: [
      {
        id: "p1",
        title: "President",
        unopposed: false,
        candidates: [
          { id: "c1", name: "Ama Mensah", manifesto: "Lecture notes in accessible formats within a week." },
          { id: "c2", name: "Kojo Addo", manifesto: "A quiet study room in every hall." },
        ],
      },
      {
        id: "p2",
        title: "Treasurer",
        unopposed: true,
        candidates: [{ id: "c3", name: "Yaw Boateng", manifesto: "Accounts published every term." }],
      },
    ],
  }),
  configure: async () => ({ ok: false, error: "This is a preview. Run ASSN Ballot to connect a terminal." }),
  verify: async () => ({
    status: "VERIFIED",
    token: "preview",
    firstName: "Ama",
    fullName: "Ama Serwaa Mensah",
    indexNumber: "2300123",
    photoUrl: null,
    programme: "BEd Special Education",
    level: "300",
    campus: "North Campus",
  }),
  cast: async () => ({ status: "REFUSED", reason: "This is a preview — no vote was taken." }),
  reconfigure: async () => ({ ok: false, error: "This is a preview." }),
  quit: async () => ({ ok: false }),
  checkKey: async () => ({ ok: true }),
  voices: async () => [{ id: "preview", name: "Preview — no voices outside ASSN Ballot", have: 0, total: 22, canFillGaps: true }],
  clip: async () => ({ ok: false, error: "This is a preview: there is no speaker behind it." }),
  setVoice: async () => ({ ok: false, error: "This is a preview." }),
  onState: () => () => undefined,
  onSay: () => () => undefined,
};

bridge.onState(render);
// The countdown and closing time, sent by the desktop process as keys.
bridge.onSay((key) => announce(key));

bridge.getState().then((initial) => {
  render(initial);
  configureVoice(bridge, initial.voice ?? undefined);
  if (initial.configured && initial.election && initial.election.phase === "OPEN") announce("welcome");
});
