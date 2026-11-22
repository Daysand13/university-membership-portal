"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { listWindowsVoices, renderWithWindowsVoice } = require("./system-voice");

/**
 * The voices the hall speaker can use, and the recording of each phrase.
 *
 * Three kinds, in order of preference:
 *
 *  1. BUNDLED — a voice shipped with ASSN Ballot, one recording per phrase,
 *     in assets/voices/<id>/. Rendered once, ahead of time, from a neural
 *     text-to-speech voice, so it is clear, identical on every terminal and
 *     needs no internet on polling day. Each has a voice.json saying what
 *     it is and under what licence.
 *  2. RECORDED — a person reading the phrases, in assets/audio/, if the
 *     association records them (see that folder's README).
 *  3. WINDOWS — the computer's own voice, rendered to a file on demand. The
 *     fallback: always there, offline, plainer.
 *
 * Whichever is chosen, a phrase it lacks is taken from the fallback voice,
 * so the hall is never left in silence about something it needed to hear.
 * Everything comes back as audio data, because only audio data can be sent
 * to the hall speaker (see renderer/voice-policy.js).
 */

const AUDIO_TYPES = { ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg" };

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** The recording of `key` in `dir`, in whichever format it was saved, or null. */
async function findClip(dir, key) {
  for (const ext of Object.keys(AUDIO_TYPES)) {
    const file = path.join(dir, `${key}${ext}`);
    if (await exists(file)) return file;
  }
  return null;
}

function createVoiceLibrary({ assetsDir, cacheDir, scripts }) {
  const keys = Object.keys(scripts);
  const windowsId = (name) => `windows:${name}`;

  async function bundled() {
    const root = path.join(assetsDir, "voices");
    let entries = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      return [];
    }
    const sets = [];
    for (const entry of entries.filter((e) => e.isDirectory())) {
      const dir = path.join(root, entry.name);
      let meta = {};
      try {
        meta = JSON.parse(await fs.readFile(path.join(dir, "voice.json"), "utf8"));
      } catch {
        // A folder without a description is still a voice; it just has no name.
      }
      sets.push({ id: `bundled:${entry.name}`, kind: "bundled", dir, name: meta.name || entry.name, description: meta.description || "", licence: meta.licence || "" });
    }
    return sets;
  }

  async function sets() {
    const list = await bundled();
    const recordedDir = path.join(assetsDir, "audio");
    list.push({ id: "recorded", kind: "recorded", dir: recordedDir, name: "The association's own recordings", description: "", licence: "" });
    for (const name of await listWindowsVoices()) {
      list.push({ id: windowsId(name), kind: "windows", dir: path.join(cacheDir, slug(name)), name: `${name} (this computer's voice)`, voiceName: name, description: "", licence: "" });
    }
    return list;
  }

  /** Every voice, with how many of the phrases it has. Recorded ones only if any exist. */
  async function list() {
    const out = [];
    for (const set of await sets()) {
      let have = 0;
      for (const key of keys) if (await findClip(set.dir, key)) have += 1;
      // A Windows voice can always make what it lacks; recorded ones only count if somebody recorded them.
      if (set.kind === "recorded" && have === 0) continue;
      out.push({ id: set.id, kind: set.kind, name: set.name, description: set.description, licence: set.licence, have, total: keys.length, canFillGaps: set.kind === "windows" });
    }
    return out;
  }

  /** Renders whatever a Windows voice is missing, all in one go. */
  async function prepareWindowsVoice(voiceName) {
    const dir = path.join(cacheDir, slug(voiceName));
    const missing = [];
    for (const key of keys) {
      if (!(await findClip(dir, key))) missing.push({ text: scripts[key], file: path.join(dir, `${key}.wav`) });
    }
    if (missing.length) await renderWithWindowsVoice({ voiceName, items: missing });
    return missing.length;
  }

  async function fromSet(set, key) {
    if (!set) return null;
    let file = await findClip(set.dir, key);
    if (!file && set.kind === "windows") {
      await prepareWindowsVoice(set.voiceName);
      file = await findClip(set.dir, key);
    }
    if (!file) return null;
    return { data: await fs.readFile(file), mime: AUDIO_TYPES[path.extname(file)] || "audio/wav", voiceId: set.id };
  }

  /**
   * The recording of one phrase: from the chosen voice, else the fallback,
   * else the first Windows voice there is. Null only if there is no audio
   * to be had at all — not on Windows, nothing bundled.
   */
  async function clip(key, { voiceId, fallbackVoiceId } = {}) {
    if (!keys.includes(key)) throw new Error(`"${key}" is not one of the announcements.`);
    const all = await sets();
    const byId = (id) => all.find((s) => s.id === id);
    const chosen = await fromSet(byId(voiceId), key);
    if (chosen) return { ...chosen, fallback: false };
    const fallback = await fromSet(byId(fallbackVoiceId) ?? all.find((s) => s.kind === "windows"), key);
    if (fallback) return { ...fallback, fallback: true };
    return null;
  }

  /** The voice to use when nothing is chosen: a bundled one if shipped, else the first Windows voice. */
  async function defaults() {
    const all = await sets();
    const firstBundled = all.find((s) => s.kind === "bundled");
    const firstWindows = all.find((s) => s.kind === "windows");
    return { voiceId: (firstBundled ?? firstWindows)?.id ?? null, fallbackVoiceId: firstWindows?.id ?? null };
  }

  return { list, clip, defaults, prepareWindowsVoice, windowsId };
}

module.exports = { createVoiceLibrary };
