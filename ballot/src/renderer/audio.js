"use strict";

import { privateVoiceAllowed, publicScript } from "./voice-policy.js";

/**
 * Everything the terminal says out loud — in two voices that never mix.
 *
 * THE PUBLIC VOICE (announce) plays a fixed announcement on the hall
 * speaker the officer chose. It takes a key, never text; the recording
 * comes from the desktop process as audio data, and audio data is the only
 * thing that can be sent to a particular speaker (setSinkId). A browser's
 * speech engine cannot be — it always plays on the default output.
 *
 * THE PRIVATE VOICE (speakPrivately) is for the voter: candidates' names,
 * their choice, their ballot read back. It uses the speech engine, so it
 * plays on the default output — the voter's headphones, where their own
 * screen reader also speaks. If the default output turns out to be the
 * hall speaker, it stays silent (see privateVoiceAllowed): a voter's choice
 * must never be heard by the hall. Everything it would say is on screen,
 * for the voter's screen reader, regardless.
 */

let bridge = null;
let settings = { enabled: true, deviceId: null, volume: 0.9, voiceId: null, fallbackVoiceId: null, defaultIsHeadphones: false };
let outputs = [];
let privacy = { allowed: false, reason: "Checking the speakers…" };
let lastKey = null;
const clips = new Map();
const listeners = new Set();

/** What the officer's status line shows. */
const status = {
  /** "ok" | "warning" | "error" */
  level: "ok",
  message: "",
  lastKey: null,
  lastAt: null,
  lastResult: null,
  usedFallback: false,
};

function notify() {
  for (const listener of listeners) listener(getStatus());
}

export function onStatus(listener) {
  listeners.add(listener);
  listener(getStatus());
  return () => listeners.delete(listener);
}

export function getStatus() {
  const hall = settings.deviceId ? outputs.find((o) => o.deviceId === settings.deviceId) : null;
  return {
    ...status,
    enabled: settings.enabled,
    speakerConnected: !settings.deviceId || Boolean(hall),
    speakerName: hall?.label || (settings.deviceId ? settings.deviceLabel || "A speaker that is not connected" : "Windows' default output"),
    privateAllowed: privacy.allowed,
    privateReason: privacy.reason,
    outputs: outputs.map((o) => ({ deviceId: o.deviceId, label: o.label })),
  };
}

async function refreshOutputs() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    outputs = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d, i) => ({ deviceId: d.deviceId, groupId: d.groupId, label: d.label || `Speaker ${i + 1}` }));
  } catch {
    outputs = [];
  }
  privacy = privateVoiceAllowed({
    outputs,
    publicDeviceId: settings.deviceId,
    announcementsOn: settings.enabled,
    defaultIsHeadphones: settings.defaultIsHeadphones === true,
  });
  if (!privacy.allowed && "speechSynthesis" in window) window.speechSynthesis.cancel();

  const connected = !settings.deviceId || outputs.some((o) => o.deviceId === settings.deviceId);
  if (settings.enabled && !connected) {
    status.level = "error";
    status.message = "The hall speaker is not connected. Announcements cannot be heard until it is.";
  } else if (status.level === "error" && status.message.startsWith("The hall speaker")) {
    status.level = "ok";
    status.message = "";
  }
  notify();
}

/** Called once at start, and whenever the desktop process sends new settings. */
export function configure(nextBridge, nextSettings) {
  bridge = nextBridge ?? bridge;
  if (nextSettings) settings = { ...settings, ...nextSettings };
  void refreshOutputs();
}

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  // A speaker unplugged or plugged in mid-poll: re-checked at once, both for
  // the status line and for whether the private voice is still safe.
  navigator.mediaDevices.addEventListener("devicechange", () => void refreshOutputs());
}

async function recording(key) {
  if (clips.has(key)) return clips.get(key);
  const reply = await bridge.clip(key);
  if (!reply || !reply.ok) throw new Error(reply?.error || "No recording could be made of that announcement.");
  const bytes = Uint8Array.from(atob(reply.base64), (c) => c.charCodeAt(0));
  const entry = { url: URL.createObjectURL(new Blob([bytes], { type: reply.mime })), fallback: reply.fallback };
  clips.set(key, entry);
  return entry;
}

/** Recordings are cached by phrase; a new voice means new recordings. */
export function forgetRecordings() {
  for (const { url } of clips.values()) URL.revokeObjectURL(url);
  clips.clear();
}

/**
 * Says a fixed announcement on the hall speaker.
 *
 * @param {string} key one of PUBLIC_ANNOUNCEMENTS — anything else is refused
 * @param {{force?: boolean}} [options] force: play even when announcements are off (the officer's test)
 */
export async function announce(key, { force = false } = {}) {
  if (!publicScript(key)) {
    // Not a phrase the hall may hear. Refused, and loudly in the log,
    // because it would mean somebody tried to send it something else.
    console.error(`[ballot] refused to announce "${String(key).slice(0, 40)}": not a public announcement`);
    return false;
  }
  if (!force && !settings.enabled) return false;
  if (!bridge || !bridge.clip) return false;
  if (key !== "test") lastKey = key;

  try {
    const { url, fallback } = await recording(key);
    const audio = new Audio(url);
    audio.volume = settings.volume;
    if (settings.deviceId && typeof audio.setSinkId === "function") await audio.setSinkId(settings.deviceId);
    await audio.play();
    Object.assign(status, {
      lastKey: key,
      lastAt: new Date(),
      lastResult: "played",
      usedFallback: fallback,
      level: fallback ? "warning" : status.level === "error" ? "error" : "ok",
      message: fallback
        ? "The chosen voice has no recording of that phrase, so the fallback voice said it."
        : status.level === "error"
          ? status.message
          : "",
    });
    notify();
    return true;
  } catch (err) {
    Object.assign(status, {
      lastKey: key,
      lastAt: new Date(),
      lastResult: "failed",
      level: "error",
      message: `The last announcement could not be played: ${err.message}`,
    });
    notify();
    return false;
  }
}

/** The officer's "say that again" — the last real announcement, never the test. */
export function repeatLast() {
  return lastKey ? announce(lastKey, { force: true }) : Promise.resolve(false);
}

/**
 * For the voter alone: a candidate's name, their choice, their ballot read
 * back. Silent whenever the hall might hear it.
 */
export function speakPrivately(text) {
  if (!privacy.allowed || !text || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Anything the voter's voice was saying stops — between voters, and if privacy is lost. */
export function stopPrivate() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
