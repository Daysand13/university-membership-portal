"use strict";

import { announce, play } from "./audio.js";

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
const screens = ["setup", "welcome", "locked", "ballot", "review", "done"];

const RESET_AFTER_MS = 5000;

let state = { configured: false, positions: [], election: null };
let session = null; // { token, firstName, choices, index }
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

  el("connection").textContent = state.online ? "Connected" : "Offline — votes are being kept";
  el("connection").classList.toggle("warn", !state.online);
  el("election-title").textContent = state.election ? state.election.title : "";
  el("queued").textContent = state.queued ? `${state.queued} waiting to be sent` : "";

  const remaining = state.msRemaining;
  el("countdown").textContent =
    remaining === null || remaining === undefined ? "" : `${Math.ceil(remaining / 60000)} min left`;

  if (!state.configured) {
    show("setup");
    return;
  }

  // A voter part-way through a ballot is not thrown off it by the clock;
  // the paper they are holding is still taken. Anyone arriving after the
  // close finds the terminal locked.
  const phase = state.election ? state.election.phase : "CLOSED";
  if (phase !== "OPEN" && !session) {
    showLocked(phase);
    return;
  }
  if (!session && el("screen-welcome").hidden && el("screen-done").hidden) show("welcome");
}

function showLocked(phase) {
  const messages = {
    SCHEDULED: "Voting has not opened yet. Please come back at the published time.",
    POSTPONED: state.election?.notice || "The election has been postponed by the Electoral Commission.",
    CLOSED: "Voting has closed. Thank you to everyone who took part.",
  };
  el("locked-heading").textContent = phase === "POSTPONED" ? "The election has been postponed" : "Voting is closed";
  el("locked-message").textContent = messages[phase] ?? messages.CLOSED;
  show("locked");
}

// --- Checking a voter in ---------------------------------------------------

async function handleIndexSubmit(event) {
  event.preventDefault();
  const input = el("indexNumber");
  const error = el("verify-error");
  error.textContent = "";

  const outcome = await bridge.verify(input.value);

  if (outcome.status === "VERIFIED") {
    session = { token: outcome.token, firstName: outcome.firstName, choices: [], index: 0 };
    input.value = "";
    play("member_verified");
    live(`${outcome.firstName}, you are verified. The ballot begins.`);
    renderPosition();
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

// Leaving kiosk mode: the officer's key, never a voter's keystroke.
document.addEventListener("keydown", async (event) => {
  if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "q")) return;
  // A terminal nobody has set up yet has no key to ask for.
  if (!state.configured) {
    await bridge.quit("");
    return;
  }
  const key = window.prompt("Officer key to close ASSN Ballot:");
  if (!key) return;
  const result = await bridge.quit(key);
  if (!result.ok) live("That key was not accepted.");
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
  verify: async () => ({ status: "VERIFIED", token: "preview", firstName: "Preview" }),
  cast: async () => ({ status: "REFUSED", reason: "This is a preview — no vote was taken." }),
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
