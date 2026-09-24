"use strict";

import { announce, play } from "./audio.js";
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
  state = { ...state, ...next };

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

  if (outcome.status === "VERIFIED") {
    session = { token: outcome.token, voter: outcome, choices: [], index: 0 };
    input.value = "";
    play("member_verified");
    showIdentity(outcome);
    return;
  }

  const spoken = {
    INVALID_INDEX: "voter_denied",
    DUES_UNPAID: "dues_unpaid",
    ALREADY_VOTED: "already_voted",
    VOTING_CLOSED: "election_closed",
  }[outcome.status];

  const written = {
    INVALID_INDEX: "That index number is not registered. Speak to the Electoral Commission officer.",
    DUES_UNPAID: "Your dues for this academic year are not paid, so you cannot vote in this election.",
    ALREADY_VOTED: "Our records show you have already voted in this election.",
    VOTING_CLOSED: "Voting is not open at the moment.",
    OFFLINE: "This terminal cannot reach the portal, so it cannot check you in. Tell the officer.",
    ERROR: "Something went wrong checking that number. Tell the officer.",
  }[outcome.status] ?? "That number could not be checked. Tell the officer.";

  if (spoken) play(spoken);
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
  announce(`Please check the photograph. ${spoken}`);
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
  // The names come from the database, so no recording could cover them:
  // they are spoken, and they are also on screen for a screen reader.
  announce(
    `${position.title}. ${position.candidates.length} candidate${position.candidates.length === 1 ? "" : "s"}. ` +
      position.candidates.map((c, i) => `${i + 1}. ${c.name}.`).join(" "),
  );
  live(`${position.title}: ${position.candidates.length} standing.`);
}

function recordChoice(candidateId) {
  const position = state.positions[session.index];
  session.choices = session.choices.filter((c) => c.positionId !== position.id);
  if (candidateId) session.choices.push({ positionId: position.id, candidateId });
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

    const dt = document.createElement("dt");
    dt.textContent = position.title;
    const dd = document.createElement("dd");
    dd.textContent = candidate ? candidate.name : "Skipped";
    if (!candidate) dd.className = "skipped";
    list.append(dt, dd);
    spoken.push(`${position.title}: ${candidate ? candidate.name : "skipped"}.`);
  }

  show("review");
  announce(`Please check your ballot. ${spoken.join(" ")} Confirm to submit it.`);
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

  if (result.status === "RECORDED" || result.status === "QUEUED") play("vote_confirmed");
  live(el("done-message").textContent);
  show("done");

  // Ready for the next voter, and nothing of the last one left on screen.
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    session = null;
    render({});
    show(state.election && state.election.phase === "OPEN" ? "welcome" : "locked");
    if (state.election && state.election.phase === "OPEN") play("welcome");
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
    play("welcome");
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
  recordChoice(chosen ? chosen.value : null);
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
  announce(`Chosen: ${label.textContent}.`);
});

/**
 * The officer's controls: close this terminal, or point it at a different
 * station. One officer often has several machines to see to, and asking
 * them to edit a file in AppData to move one is not a plan.
 */
function openOfficerPanel() {
  el("officer-error").textContent = "";
  el("officer-key").value = "";
  el("officer-dialog").showModal();
  el(state.configured ? "officer-key" : "officer-quit").focus();
}

async function officerAction(run) {
  const key = el("officer-key").value;
  // A terminal nobody has set up yet has no key to ask for.
  if (state.configured && !key) {
    el("officer-error").textContent = "Enter this terminal's key.";
    return;
  }
  const result = await run(key);
  if (result.ok) {
    el("officer-dialog").close();
    return;
  }
  el("officer-error").textContent = result.error || "That key was not accepted.";
}

el("officer").addEventListener("click", openOfficerPanel);
el("officer-cancel").addEventListener("click", () => el("officer-dialog").close());
el("officer-quit").addEventListener("click", () => officerAction((key) => bridge.quit(key)));
el("officer-switch").addEventListener("click", () => officerAction((key) => bridge.reconfigure(key)));

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
        candidates: [
          { id: "c1", name: "Ama Mensah", manifesto: "Lecture notes in accessible formats within a week." },
          { id: "c2", name: "Kojo Addo", manifesto: "A quiet study room in every hall." },
        ],
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
  onState: () => () => undefined,
  onSay: () => () => undefined,
};

bridge.onState(render);
bridge.onSay(play);

bridge.getState().then((initial) => {
  render(initial);
  if (initial.configured && initial.election && initial.election.phase === "OPEN") play("welcome");
});
