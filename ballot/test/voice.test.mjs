import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_ANNOUNCEMENTS,
  PUBLIC_KEYS,
  announcementForCheckIn,
  privateVoiceAllowed,
  publicScript,
} from "../src/renderer/voice-policy.js";

/**
 * The hall speaker and the voter's headphones.
 *
 * What these protect is the secrecy of the ballot: the hall hears general
 * status and nothing else, and the voter's choices are never spoken where
 * the hall could hear them.
 */

const outputs = [
  { deviceId: "default", groupId: "g-headphones", label: "Default - Headphones" },
  { deviceId: "communications", groupId: "g-headphones", label: "Communications - Headphones" },
  { deviceId: "dev-headphones", groupId: "g-headphones", label: "Headphones (USB)" },
  { deviceId: "dev-hall", groupId: "g-hall", label: "Speakers (Hall PA)" },
];

test("the hall speaker accepts only the fixed announcements — never free text", () => {
  assert.equal(publicScript("member_verified"), "Member verification successful.");
  assert.equal(publicScript("Chosen: Ama Mensah."), null);
  assert.equal(publicScript("President. 2 candidates. 1. Ama Mensah."), null);
  assert.equal(publicScript("constructor"), null, "an object's own machinery is not a phrase");
  assert.equal(publicScript(undefined), null);
});

test("no public announcement could name a person or a choice", () => {
  for (const [key, text] of Object.entries(PUBLIC_ANNOUNCEMENTS)) {
    assert.doesNotMatch(text, /\$\{|\{\{|%s/, `${key} has no blanks to fill with somebody's name`);
  }
  // The examples the association asked for are all there.
  for (const wanted of [
    "Member verification successful.",
    "You are eligible to vote.",
    "Voting is currently closed.",
    "Please complete member verification.",
    "Please contact the election officer for assistance.",
  ]) {
    assert.ok(Object.values(PUBLIC_ANNOUNCEMENTS).some((t) => t.includes(wanted.replace(/\.$/, ""))), wanted);
  }
  assert.ok(PUBLIC_KEYS.length >= 20);
});

test("what the hall hears after a check-in says whether they may vote, and nothing personal", () => {
  assert.equal(announcementForCheckIn("VERIFIED"), "member_verified");
  assert.equal(announcementForCheckIn("ALREADY_VOTED"), "already_voted");
  assert.equal(announcementForCheckIn("VOTING_CLOSED"), "election_closed");
  // Unpaid dues are the person's own business; the hall can see who is standing there.
  assert.equal(announcementForCheckIn("DUES_UNPAID"), "contact_officer");
  assert.doesNotMatch(PUBLIC_ANNOUNCEMENTS.contact_officer, /dues|pay/i);
  assert.equal(announcementForCheckIn("OFFLINE"), "assistance");
  assert.equal(announcementForCheckIn("something new"), "assistance");
});

test("the voter's spoken ballot stays off until an officer confirms the headphones", () => {
  const verdict = privateVoiceAllowed({ outputs, publicDeviceId: "dev-hall", announcementsOn: true, defaultIsHeadphones: false });
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /headphones/);
});

test("with the hall speaker separate from the headphones, the voter's ballot may be spoken to them", () => {
  const verdict = privateVoiceAllowed({ outputs, publicDeviceId: "dev-hall", announcementsOn: true, defaultIsHeadphones: true });
  assert.equal(verdict.allowed, true);
});

test("if the hall speaker IS the default output, the voter's ballot is never spoken — whatever an officer ticked", () => {
  const hallIsDefault = [
    { deviceId: "default", groupId: "g-hall", label: "Default - Speakers (Hall PA)" },
    { deviceId: "dev-hall", groupId: "g-hall", label: "Speakers (Hall PA)" },
    { deviceId: "dev-headphones", groupId: "g-headphones", label: "Headphones (USB)" },
  ];
  const verdict = privateVoiceAllowed({ outputs: hallIsDefault, publicDeviceId: "dev-hall", announcementsOn: true, defaultIsHeadphones: true });
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /heard by the hall/);
});

test("a hall speaker that has been unplugged can't be told apart from the headphones, so the voter's ballot goes quiet", () => {
  const unplugged = outputs.filter((o) => o.deviceId !== "dev-hall");
  const verdict = privateVoiceAllowed({ outputs: unplugged, publicDeviceId: "dev-hall", announcementsOn: true, defaultIsHeadphones: true });
  assert.equal(verdict.allowed, false);
});

test("a terminal with no hall speaker at all, once the headphones are confirmed, reads the ballot privately", () => {
  const verdict = privateVoiceAllowed({ outputs, publicDeviceId: null, announcementsOn: false, defaultIsHeadphones: true });
  assert.equal(verdict.allowed, true);
});
