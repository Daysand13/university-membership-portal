import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { isLikelyBot, HONEYPOT_FIELD_NAME, TIMING_FIELD_NAME } from "@/lib/bot-protection";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

describe("isLikelyBot", () => {
  it("flags a submission where the honeypot field was filled in", () => {
    const fd = new FormData();
    fd.set(HONEYPOT_FIELD_NAME, "http://spam.example.com");
    expect(isLikelyBot(fd)).toBe(true);
  });

  it("flags a submission that arrived suspiciously fast after the form rendered", () => {
    const fd = new FormData();
    fd.set(TIMING_FIELD_NAME, Date.now().toString());
    expect(isLikelyBot(fd)).toBe(true);
  });

  it("does not flag a normal submission with an empty honeypot and realistic timing", () => {
    const fd = new FormData();
    fd.set(HONEYPOT_FIELD_NAME, "");
    fd.set(TIMING_FIELD_NAME, (Date.now() - 15_000).toString());
    expect(isLikelyBot(fd)).toBe(false);
  });

  it("does not flag a submission with no bot-protection fields at all (e.g. an older cached page)", () => {
    const fd = new FormData();
    fd.set("firstName", "Test");
    expect(isLikelyBot(fd)).toBe(false);
  });
});

describe("checkRateLimit", () => {
  it("allows attempts up to the limit, then blocks further attempts within the same window", async () => {
    const key = `test:${randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, { max: 3, windowSeconds: 60 });
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key, { max: 3, windowSeconds: 60 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("keeps separate keys independent of each other", async () => {
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;
    for (let i = 0; i < 2; i++) {
      await checkRateLimit(keyA, { max: 2, windowSeconds: 60 });
    }
    const aBlocked = await checkRateLimit(keyA, { max: 2, windowSeconds: 60 });
    const bAllowed = await checkRateLimit(keyB, { max: 2, windowSeconds: 60 });
    expect(aBlocked.allowed).toBe(false);
    expect(bAllowed.allowed).toBe(true);
  });

  it("does not count attempts from outside the time window", async () => {
    const key = `test:${randomUUID()}`;
    // Simulate an old attempt from well outside a 1-second window.
    await db.rateLimitAttempt.create({ data: { key, createdAt: new Date(Date.now() - 5000) } });
    const result = await checkRateLimit(key, { max: 1, windowSeconds: 1 });
    // The old attempt is outside the window, so this one should still be allowed.
    expect(result.allowed).toBe(true);
  });
});
