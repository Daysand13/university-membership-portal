"use strict";

const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * The Windows voices on this machine, rendered to audio files.
 *
 * The fallback for the public voice. A browser's speech engine cannot be
 * pointed at a particular speaker — it always plays on the default output,
 * which is the voter's headphones — so speaking an announcement "live" would
 * never reach the hall. Rendering it to a WAV file first means it plays
 * through the hall speaker like any recording.
 *
 * Uses .NET's System.Speech through PowerShell, which every Windows has: no
 * download, no internet, nothing to install. These are the classic desktop
 * voices (David, Zira and the like) — clear, if plainer than a recording,
 * which is exactly what a fallback should be.
 */

function powershell(script, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { env: { ...process.env, ...env }, windowsHide: true, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => (err ? reject(new Error(stderr?.trim() || err.message)) : resolve(stdout)),
    );
  });
}

let cachedVoices = null;

/** The installed voices' names, e.g. ["Microsoft David Desktop", "Microsoft Zira Desktop"]. */
async function listWindowsVoices() {
  if (process.platform !== "win32") return [];
  if (cachedVoices) return cachedVoices;
  try {
    const out = await powershell(
      "Add-Type -AssemblyName System.Speech; " +
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
        "$s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name }; " +
        "$s.Dispose()",
    );
    cachedVoices = out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    cachedVoices = [];
  }
  return cachedVoices;
}

/**
 * Renders announcements with a Windows voice, one WAV file each.
 *
 * Everything is passed in environment variables rather than spliced into
 * the script, so no text can break out of it — the phrases come from a
 * fixed list anyway, but the script should not have to rely on that.
 *
 * @param {object} params
 * @param {string} params.voiceName one of listWindowsVoices()
 * @param {Array<{text:string, file:string}>} params.items
 * @param {number} [params.rate] -10 (slow) to 10; a hall wants a little slower than normal
 */
async function renderWithWindowsVoice({ voiceName, items, rate = -1 }) {
  if (process.platform !== "win32") throw new Error("Windows voices are only available on Windows.");
  const voices = await listWindowsVoices();
  if (!voices.includes(voiceName)) throw new Error(`The voice "${voiceName}" is not installed on this computer.`);
  if (items.length === 0) return;

  await Promise.all(items.map((item) => fs.mkdir(path.dirname(item.file), { recursive: true })));
  const plan = JSON.stringify(items.map((item) => ({ t: item.text, f: item.file })));

  await powershell(
    "Add-Type -AssemblyName System.Speech; " +
      "$items = $env:ASSN_VOICE_PLAN | ConvertFrom-Json; " +
      "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
      "$s.SelectVoice($env:ASSN_VOICE_NAME); " +
      "$s.Rate = [int]$env:ASSN_VOICE_RATE; " +
      "foreach ($i in $items) { $s.SetOutputToWaveFile($i.f); $s.Speak($i.t) }; " +
      "$s.SetOutputToNull(); $s.Dispose()",
    { ASSN_VOICE_PLAN: plan, ASSN_VOICE_NAME: voiceName, ASSN_VOICE_RATE: String(Math.max(-10, Math.min(10, rate))) },
  );
}

module.exports = { listWindowsVoices, renderWithWindowsVoice };
