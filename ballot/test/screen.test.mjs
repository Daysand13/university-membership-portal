import { test } from "node:test";
import assert from "node:assert/strict";
import { CONNECTION, chooseScreen, connectionLabel } from "../src/renderer/screen.js";

const open = { id: "e1", title: "Election", phase: "OPEN", notice: null };

test("a terminal nobody has set up asks to be set up", () => {
  assert.equal(chooseScreen({ configured: false, connection: CONNECTION.UNKNOWN }).screen, "setup");
});

test("a terminal the portal refuses gets its setup form back, with the reason", () => {
  // The bug this exists to stop: a mistyped key left the officer looking
  // at "Voting is closed" with no way back to the form, restart or not.
  const shown = chooseScreen({
    configured: true,
    connection: CONNECTION.REJECTED,
    lastError: "This terminal is not registered, or its key has changed.",
    election: null,
  });
  assert.equal(shown.screen, "setup");
  assert.match(shown.message, /not registered/);
});

test("a terminal that cannot reach the portal does not claim voting has closed", () => {
  const shown = chooseScreen({ configured: true, connection: CONNECTION.OFFLINE, election: null });
  assert.equal(shown.screen, "locked");
  assert.equal(shown.heading, "Waiting for the portal");
  assert.doesNotMatch(shown.message, /closed/i);
});

test("a connected terminal with nothing to vote in says exactly that", () => {
  const shown = chooseScreen({ configured: true, connection: CONNECTION.CONNECTED, election: null });
  assert.equal(shown.heading, "No election at the moment");
});

test("an open election lets a voter in", () => {
  assert.equal(chooseScreen({ configured: true, connection: CONNECTION.CONNECTED, election: open }).screen, "welcome");
});

test("each closed state says which one it is", () => {
  const phase = (p, notice = null) =>
    chooseScreen({ configured: true, connection: CONNECTION.CONNECTED, election: { ...open, phase: p, notice } });

  assert.equal(phase("SCHEDULED").heading, "Voting has not opened yet");
  assert.equal(phase("CLOSED").heading, "Voting is closed");

  const postponed = phase("POSTPONED", "Postponed to Friday after a power failure.");
  assert.equal(postponed.heading, "The election has been postponed");
  assert.match(postponed.message, /power failure/);
});

test("somebody part-way through a ballot keeps it when the line drops", () => {
  const shown = chooseScreen({ configured: true, connection: CONNECTION.OFFLINE, election: open }, true);
  assert.equal(shown.screen, "ballot");
});

test("the status pill tells a refusal from a dead line", () => {
  assert.equal(connectionLabel(CONNECTION.CONNECTED), "Connected");
  assert.equal(connectionLabel(CONNECTION.REJECTED), "Not accepted by the portal");
  assert.equal(connectionLabel(CONNECTION.OFFLINE, 0), "Offline — trying to reconnect");
  assert.equal(connectionLabel(CONNECTION.OFFLINE, 3), "Offline — votes are being kept");
  assert.equal(connectionLabel(CONNECTION.UNKNOWN), "Connecting…");
});
