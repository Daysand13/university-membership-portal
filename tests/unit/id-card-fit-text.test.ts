import { describe, expect, it } from "vitest";
import { fitText } from "@/lib/id-card/fit-text";

const options = { sizes: [21, 19, 17], lines: 2, widthFactor: 0.6, width: 619 };

describe("fitText", () => {
  it("keeps a short value at the largest size, unchanged", () => {
    expect(fitText("Special Education", options)).toEqual({ size: 21, text: "Special Education" });
  });

  it("steps down a size before it ever shortens anything", () => {
    // Too long for two lines at 21 (capacity 88), fits at 19 (capacity 97).
    const text = "a".repeat(92);
    expect(fitText(text, options)).toEqual({ size: 19, text });
  });

  it("shortens with an ellipsis only when even the smallest size won't fit", () => {
    const result = fitText("x".repeat(400), options);
    expect(result.size).toBe(17);
    expect(result.text.endsWith("…")).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(109);
  });

  it("fits the real longest programme name without shortening it", () => {
    const programme = "BEd Community-Based Rehabilitation and Disability Studies (CBRDS)";
    expect(fitText(programme, options).text).toBe(programme);
  });
});
