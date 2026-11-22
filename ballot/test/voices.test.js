"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createVoiceLibrary } = require("../src/lib/voices");

/**
 * The voice library: a phrase comes from the chosen voice when it has it,
 * from the fallback when it doesn't, and only ever for a phrase on the list.
 */

const scripts = { member_verified: "Member verification successful.", election_closed: "Voting is currently closed." };

async function library() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "assn-voices-"));
  const voiceDir = path.join(root, "assets", "voices", "neural-test");
  await fs.mkdir(voiceDir, { recursive: true });
  await fs.writeFile(path.join(voiceDir, "voice.json"), JSON.stringify({ name: "Test neural voice", licence: "CC0" }));
  // Only one of the two phrases recorded.
  await fs.writeFile(path.join(voiceDir, "member_verified.wav"), Buffer.from("RIFF-test-recording"));
  return createVoiceLibrary({ assetsDir: path.join(root, "assets"), cacheDir: path.join(root, "cache"), scripts });
}

test("a phrase the chosen voice has comes from that voice", async () => {
  const voices = await library();
  const clip = await voices.clip("member_verified", { voiceId: "bundled:neural-test" });
  assert.equal(clip.voiceId, "bundled:neural-test");
  assert.equal(clip.fallback, false);
  assert.equal(clip.mime, "audio/wav");
  assert.equal(clip.data.toString(), "RIFF-test-recording");
});

test("anything not on the list is refused outright", async () => {
  const voices = await library();
  await assert.rejects(() => voices.clip("Chosen: Ama Mensah.", { voiceId: "bundled:neural-test" }), /not one of the announcements/);
});

test("a bundled voice reports how many phrases it covers", async () => {
  const voices = await library();
  const list = await voices.list();
  const neural = list.find((v) => v.id === "bundled:neural-test");
  assert.equal(neural.name, "Test neural voice");
  assert.equal(neural.have, 1);
  assert.equal(neural.total, 2);
  assert.equal(neural.canFillGaps, false);
});

test(
  "a phrase the chosen voice lacks is said by this computer's own voice, rendered to a file",
  { skip: process.platform !== "win32" && "Windows voices exist only on Windows" },
  async () => {
    const voices = await library();
    const clip = await voices.clip("election_closed", { voiceId: "bundled:neural-test" });
    assert.ok(clip, "a fallback recording was made");
    assert.equal(clip.fallback, true);
    assert.match(clip.voiceId, /^windows:/);
    assert.equal(clip.data.subarray(0, 4).toString(), "RIFF", "a real WAV file, which is what can be sent to the hall speaker");
  },
);
