/**
 * The words Read Aloud uses — the website's, exactly.
 *
 * A member who uses Read Aloud on the website and then on the app should
 * hear a form described the same way in both: "First name, text box,
 * empty." These three functions are copied from the website's
 * src/lib/a11y/page-speech.ts, where they are plain functions with no DOM
 * in them, and tests/speech-words.test.ts runs both copies on the same
 * inputs so they cannot quietly drift apart.
 *
 * Pure, with no React Native import, so the test can load it.
 */

/** What a control is, in words an ordinary listener will recognise. */
export type ControlKind = "checkbox" | "radio" | "select" | "textbox" | "file" | "button" | "link";

export interface ControlDescription {
  kind: ControlKind;
  /** What it is called. Empty means nothing labels it — worth saying so. */
  name: string;
  /** Tick boxes and radio buttons. */
  checked?: boolean;
  /** What is in it, or chosen in it. */
  value?: string;
  disabled?: boolean;
  required?: boolean;
}

const KIND_WORD: Record<ControlKind, string> = {
  checkbox: "tick box",
  radio: "option",
  select: "dropdown",
  textbox: "text box",
  file: "file chooser",
  button: "button",
  link: "link",
};

/**
 * One control, said aloud.
 *
 * Name first, because that is what somebody is listening for; then what it
 * is; then what state it is in. A control with no name says so rather than
 * passing in silence — an unlabelled box is a fault worth hearing.
 */
export function describeControl(control: ControlDescription): string {
  const parts: string[] = [];
  parts.push(control.name.trim() || "unlabelled");
  parts.push(KIND_WORD[control.kind]);

  if (control.kind === "checkbox") parts.push(control.checked ? "ticked" : "not ticked");
  else if (control.kind === "radio") parts.push(control.checked ? "chosen" : "not chosen");
  else if (control.kind === "select" || control.kind === "textbox" || control.kind === "file") {
    const value = (control.value ?? "").trim();
    parts.push(value || "empty");
  }

  if (control.required) parts.push("required");
  if (control.disabled) parts.push("not available");

  return `${parts.join(", ")}.`;
}

/**
 * Joins what was found into speakable prose.
 *
 * Each block ends up as its own sentence, so the voice pauses between a
 * heading and the paragraph under it instead of running them together.
 */
export function joinForSpeech(parts: string[]): string {
  const cleaned = parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0)
    .map((part) => (/[.!?,:;]$/.test(part) ? part : `${part}.`));
  return cleaned.join(" ");
}

/**
 * Speech quietly drops an utterance that is too long, so a screen is spoken
 * a sentence at a time, one after another.
 *
 * A full stop after an initial is not the end of a sentence: "B.Ed." and
 * "E.N" would otherwise be broken into pieces and read with a pause in the
 * middle of somebody's own qualification or signature. Anything too short
 * to be a sentence is joined to what follows it.
 */
export function chunkForSpeech(text: string): string[] {
  /** "B.Ed.", "E.N." — a stop inside a name, not the end of a sentence. */
  const abbreviated = (sofar: string) => /(?:^|\s)(?:[A-Za-z]\.)+[A-Za-z]*\.$/.test(sofar);

  const raw: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    current += character;
    if (character !== "." && character !== "!" && character !== "?" && character !== "\n") continue;
    // A stop with no space after it is inside something — a decimal, an
    // abbreviation — rather than between two sentences.
    const next = text[i + 1];
    if (next !== undefined && !/\s/.test(next)) continue;
    if (abbreviated(current)) continue;
    if (current.trim()) raw.push(current.trim());
    current = "";
  }
  if (current.trim()) raw.push(current.trim());

  // Anything too short to be a sentence is joined to what follows it.
  const chunks: string[] = [];
  let carried = "";
  for (const chunk of raw) {
    const joined = carried ? `${carried} ${chunk}` : chunk;
    if (chunk.replace(/[.!?]$/, "").trim().length <= 3 && joined.length < 300) {
      carried = joined;
      continue;
    }
    chunks.push(joined);
    carried = "";
  }
  if (carried) chunks.push(carried);
  return chunks;
}

/**
 * Where on the screen each piece sits, turned into reading order.
 *
 * Top to bottom, then left to right — but two pieces whose tops are within
 * a few points of each other are on the same line, and are read left to
 * right rather than by whichever happens to be a pixel higher. That is the
 * difference between "Upcoming, Past" and "Past, Upcoming".
 */
export function inReadingOrder<T extends { x: number; y: number }>(pieces: T[], lineTolerance = 8): T[] {
  return [...pieces].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= lineTolerance) return a.x - b.x;
    return a.y - b.y;
  });
}
