import { describe, expect, it } from "vitest";
import { clearBackdrop } from "@/lib/id-card/images";

const WHITE = [255, 255, 255, 255];
const INK = [30, 20, 90, 255];

/** A width × height RGBA image from rows of pixel keys. */
function image(rows: string[], palette: Record<string, number[]>) {
  const data = new Uint8Array(rows.length * rows[0].length * 4);
  rows.forEach((row, y) => [...row].forEach((key, x) => data.set(palette[key], (y * row.length + x) * 4)));
  return { data, width: rows[0].length, height: rows.length };
}
const alphaAt = (img: ReturnType<typeof image>, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

describe("clearBackdrop", () => {
  it("clears the white around a logo but keeps white enclosed by the artwork", () => {
    const img = image(["wwwww", "wkkkw", "wkwkw", "wkkkw", "wwwww"], { w: WHITE, k: INK });
    clearBackdrop(img.data, img.width, img.height);

    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 4, 2)).toBe(0);
    expect(alphaAt(img, 1, 1)).toBe(255); // artwork
    expect(alphaAt(img, 2, 2)).toBe(255); // enclosed white stays
  });

  it("fades off-white edge pixels instead of cutting them hard", () => {
    const img = image(["wgk"], { w: WHITE, g: [241, 241, 241, 255], k: INK });
    clearBackdrop(img.data, img.width, img.height);

    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 1, 0)).toBeGreaterThan(0);
    expect(alphaAt(img, 1, 0)).toBeLessThan(255);
    expect(alphaAt(img, 2, 0)).toBe(255);
  });
});
