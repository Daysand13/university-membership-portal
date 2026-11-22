/**
 * Records every hall announcement with a neural voice, once, ahead of time.
 *
 *   node ballot/scripts/render-voice.mjs                  (default voice)
 *   node ballot/scripts/render-voice.mjs --voice en_GB-alan-medium
 *
 * Why ahead of time: polling day is no day to depend on the internet, and a
 * hall wants the same clear voice from every terminal. The phrases never
 * change (they are the fixed list in src/renderer/voice-policy.js), so each
 * is rendered once into assets/voices/<voice>/ and shipped with ASSN Ballot.
 * Nothing is synthesised on the day and nothing needs a connection.
 *
 * The engine is Piper — open source, neural, runs entirely offline. It is
 * only used here, on a developer's machine, to make the recordings; it is
 * not shipped inside ASSN Ballot. Its voices are separately licensed, so the
 * script reads the chosen voice's model card and refuses one whose licence
 * it doesn't recognise as permitting this use, unless told otherwise.
 *
 * Downloads (once, into ballot/.voice-tools, which git ignores):
 *   - the Piper program for Windows   (~22 MB, github.com/rhasspy/piper)
 *   - the chosen voice model           (~60–110 MB, huggingface.co/rhasspy/piper-voices)
 */
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ballot = resolve(here, "..");
const tools = join(ballot, ".voice-tools");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const voice = flag("voice") ?? "en_GB-cori-high";
const acceptLicence = args.includes("--accept-licence");

const PIPER_ZIP = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";
const [lang, speaker, quality] = (() => {
  const m = /^([a-z]{2})_([A-Z]{2})-([a-z0-9_]+)-(x_low|low|medium|high)$/.exec(voice);
  if (!m) throw new Error(`"${voice}" is not a Piper voice name like en_GB-cori-high.`);
  return [`${m[1]}_${m[2]}`, m[3], m[4]];
})();
const family = lang.slice(0, 2);
const modelBase = `https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/${family}/${lang}/${speaker}/${quality}`;

/** Licences that plainly allow recording these phrases and shipping the recordings. */
const ACCEPTABLE = [/CC0/i, /public domain/i, /CC[- ]BY(?![- ]NC)(?:[- ]SA)?[- ]?\d/i, /\bMIT\b/i, /Apache/i];

async function download(url, file) {
  try {
    await stat(file);
    return; // already here
  } catch {
    // fetch it
  }
  await mkdir(dirname(file), { recursive: true });
  console.log(`  downloading ${url}`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(file));
}

async function piperExe() {
  const exe = join(tools, "piper", "piper.exe");
  try {
    await stat(exe);
    return exe;
  } catch {
    // unpack it
  }
  if (process.platform !== "win32") throw new Error("This script uses Piper's Windows build. Run it on Windows.");
  const zip = join(tools, "piper_windows_amd64.zip");
  await download(PIPER_ZIP, zip);
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${tools}'`]);
  await stat(exe);
  return exe;
}

function speak(exe, model, text, outFile) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(exe, ["--model", model, "--output_file", outFile, "--sentence_silence", "0.35", "--length_scale", "1.08"], {
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise() : reject(new Error(`piper exited ${code}: ${stderr.slice(-400)}`))));
    child.stdin.end(text);
  });
}

async function main() {
  const { PUBLIC_ANNOUNCEMENTS } = await import(pathToFileURL(join(ballot, "src", "renderer", "voice-policy.js")).href);

  const modelDir = join(tools, "voices", voice);
  const model = join(modelDir, `${voice}.onnx`);
  await download(`${modelBase}/MODEL_CARD`, join(modelDir, "MODEL_CARD"));
  const card = await readFile(join(modelDir, "MODEL_CARD"), "utf8");
  const licenceLine = (card.match(/licen[cs]e[^\n]*\n?[^\n]*/i)?.[0] ?? "").replace(/\s+/g, " ").trim();
  console.log(`\n${voice}\n  model card says: ${licenceLine || "(no licence line found)"}`);
  if (!ACCEPTABLE.some((re) => re.test(card)) && !acceptLicence) {
    console.error(
      "\n  That licence isn't one this script recognises as allowing the recordings to be shipped." +
        "\n  Read the model card above. If it does allow it, run again with --accept-licence.",
    );
    process.exit(2);
  }

  await download(`${modelBase}/${voice}.onnx`, model);
  await download(`${modelBase}/${voice}.onnx.json`, `${model}.json`);
  const exe = await piperExe();

  const out = join(ballot, "assets", "voices", voice);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const [key, text] of Object.entries(PUBLIC_ANNOUNCEMENTS)) {
    await speak(exe, model, text, join(out, `${key}.wav`));
    console.log(`  ${key.padEnd(22)} ${text}`);
  }

  await writeFile(
    join(out, "voice.json"),
    JSON.stringify(
      {
        name: `${speaker.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (${lang.replace("_", " ")}, neural)`,
        description: `Recorded ahead of time with the Piper voice ${voice}. Needs no internet on polling day.`,
        licence: licenceLine,
        source: `${modelBase}/${voice}.onnx`,
        renderedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`\n${Object.keys(PUBLIC_ANNOUNCEMENTS).length} recordings in ${out}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
