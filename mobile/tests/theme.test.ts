import { describe, expect, it } from "vitest";
import { PALETTES, type Palette } from "../src/theme";

/**
 * Every palette, held to its floor.
 *
 * Light sea blue is exactly the palette that fails WCAG — the first header
 * gradient tried came out at 3.30:1 under a white title. These tests are what
 * stops the next adjustment to a colour quietly making it unreadable.
 *
 * Ordinary palettes: 4.5:1 for text (WCAG AA). High contrast: 7:1 (AAA) —
 * it is the setting somebody turns on precisely because 4.5 was not enough.
 * The edge of a control: 3:1 (WCAG 1.4.11), because somebody has to be able
 * to find the box before they can type in it.
 */

function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [keyof Palette, keyof Palette, string];

const TEXT_PAIRS: Pair[] = [
  ["ink", "surface", "body text on a card"],
  ["ink", "background", "body text on the screen"],
  ["muted", "surface", "muted text on a card"],
  ["muted", "background", "muted text on the screen"],
  ["heading", "surface", "a heading on a card"],
  ["heading", "background", "a heading on the screen"],
  ["accentText", "surface", "a link or outline button"],
  ["onButton", "button", "a button's label"],
  ["onButton", "buttonPressed", "a pressed button's label"],
  ["onHeader", "headerFrom", "the title at the deep end of the header"],
  ["onHeader", "headerTo", "the title at the light end of the header"],
  ["tabActive", "tabBar", "the chosen tab"],
  ["tabInactive", "tabBar", "the other tabs"],
  ["success", "successBg", "a success badge"],
  ["warning", "warningBg", "a warning badge"],
  ["danger", "dangerBg", "a danger badge"],
  ["danger", "surface", "an error under a box"],
  ["ink", "surfacePressed", "text on a card while pressed"],
];

const CONTROL_EDGES: Pair[] = [
  ["lineStrong", "surface", "a text box's edge"],
  ["placeholder", "surface", "placeholder text"],
];

for (const [name, palette] of Object.entries(PALETTES)) {
  const high = name.endsWith("Contrast");
  const floor = high ? 7 : 4.5;

  describe(`the ${name} palette`, () => {
    for (const [fg, bg, what] of TEXT_PAIRS) {
      it(`${what} clears ${floor}:1`, () => {
        expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(floor);
      });
    }
    for (const [fg, bg, what] of CONTROL_EDGES) {
      // Placeholder text in high contrast is held to the text floor: it is
      // still words somebody is reading.
      const edgeFloor = high && fg === "placeholder" ? 4.5 : 3;
      it(`${what} clears ${edgeFloor}:1`, () => {
        expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(edgeFloor);
      });
    }
  });
}
