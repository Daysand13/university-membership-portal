import { describe, expect, it } from "vitest";
import { detectBot, FILL_TIME_FIELD_NAME, HONEYPOT_FIELD_NAME } from "@/lib/bot-protection";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("detectBot", () => {
  it("treats an ordinary submission as human", () => {
    expect(detectBot(form({ [HONEYPOT_FIELD_NAME]: "", [FILL_TIME_FIELD_NAME]: "240000" }))).toBeNull();
  });

  it("flags a filled honeypot", () => {
    expect(detectBot(form({ [HONEYPOT_FIELD_NAME]: "https://spam.example" }))).toBe("honeypot");
  });

  it("flags a form sent faster than a person could fill it", () => {
    expect(detectBot(form({ [FILL_TIME_FIELD_NAME]: "300" }))).toBe("too-fast");
  });

  it("never flags someone because their phone's clock is wrong", () => {
    // The old check compared a phone timestamp with the server clock. A
    // phone running 20 minutes fast produced a render time "in the future",
    // which read as an instant submission. None of that reaches this check.
    const phoneClockAhead = String(Date.now() + 20 * 60 * 1000);
    expect(detectBot(form({ renderedAt: phoneClockAhead, [FILL_TIME_FIELD_NAME]: "180000" }))).toBeNull();
    expect(detectBot(form({ renderedAt: phoneClockAhead }))).toBeNull();
  });

  it("ignores the old autofill-prone honeypot name, so an open old tab can't be caught by autofill", () => {
    expect(detectBot(form({ website: "Ama Mensah" }))).toBeNull();
  });

  it("counts a missing or garbled fill time as human rather than guessing", () => {
    expect(detectBot(form({}))).toBeNull();
    expect(detectBot(form({ [FILL_TIME_FIELD_NAME]: "not-a-number" }))).toBeNull();
    expect(detectBot(form({ [FILL_TIME_FIELD_NAME]: "-5" }))).toBeNull();
  });
});
