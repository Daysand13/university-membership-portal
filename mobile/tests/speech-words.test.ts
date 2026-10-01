import { describe, expect, it } from "vitest";
import * as app from "../src/a11y/speech-words";
// The website's own copy. Plain functions — the DOM walk in that file is only
// types here, and is never called.
import * as site from "../../src/lib/a11y/page-speech";

/**
 * The app and the website say things the same way.
 *
 * A member who listens to the website's Read Aloud and then the app's should
 * hear "First name, text box, empty." in both. The app carries a copy of the
 * website's wording functions; these run both copies on the same inputs, so
 * a change to one that is not made to the other fails here.
 */

const controls: app.ControlDescription[] = [
  { kind: "textbox", name: "First name" },
  { kind: "textbox", name: "Email address", value: "ama@example.com", required: true },
  { kind: "checkbox", name: "I agree", checked: true },
  { kind: "checkbox", name: "I agree", checked: false, disabled: true },
  { kind: "radio", name: "Yes, I graduated from UEW", checked: false },
  { kind: "select", name: "Region", value: "Central" },
  { kind: "file", name: "Medical report" },
  { kind: "button", name: "Submit application" },
  { kind: "link", name: "Open the website" },
  { kind: "button", name: "  " },
];

const prose = [
  "Your portal\nSign in to see announcements. Use the same password.",
  "B.Ed. Special Education, Class of 2024. E.N. Mensah signed it.",
  "OK. Go. Then the long part of the sentence carries on for a while.",
  "",
];

describe("the app's Read Aloud wording matches the website's", () => {
  for (const control of controls) {
    it(`describes ${control.kind} "${control.name.trim() || "(unlabelled)"}" identically`, () => {
      expect(app.describeControl(control)).toBe(site.describeControl(control));
    });
  }

  it("joins pieces into sentences identically", () => {
    const parts = ["Your portal", "Sign in, to see", "  ", "Done."];
    expect(app.joinForSpeech(parts)).toBe(site.joinForSpeech(parts));
  });

  for (const text of prose) {
    it(`splits ${JSON.stringify(text.slice(0, 24))} into the same chunks`, () => {
      expect(app.chunkForSpeech(text)).toEqual(site.chunkForSpeech(text));
    });
  }
});

describe("reading order on a phone screen", () => {
  it("reads top to bottom", () => {
    const order = app.inReadingOrder([
      { x: 0, y: 300, text: "third" },
      { x: 0, y: 10, text: "first" },
      { x: 0, y: 120, text: "second" },
    ]);
    expect(order.map((p) => p.text)).toEqual(["first", "second", "third"]);
  });

  it("reads one line left to right, even when one piece sits a pixel higher", () => {
    const order = app.inReadingOrder([
      { x: 200, y: 99, text: "Past" },
      { x: 16, y: 102, text: "Upcoming" },
    ]);
    expect(order.map((p) => p.text)).toEqual(["Upcoming", "Past"]);
  });
});
