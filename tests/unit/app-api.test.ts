import { describe, expect, it } from "vitest";
import { bearerFrom } from "@/lib/auth/app-token";
import { eventDetail, eventSummary, newsSummary, pageFrom, pageInfo, pageSizeFrom } from "@/lib/api/app-shapes";
import { buildFrom, decideUpdate, SHA256_PATTERN, VERSION_PATTERN } from "@/lib/app-release";
import { batches, eventMessage, forLockScreen, isDeadToken, newsMessage } from "@/lib/push/message";

/**
 * The parts of the Android API that can be decided without a database:
 * what the app is allowed to see, whether it should update itself, and
 * what a notification says on a lock screen.
 */

describe("what the API hands to a phone", () => {
  it("gives out only the fields it names, never the whole row", () => {
    // The point of the shape: a column added to News tomorrow does not
    // arrive on somebody's phone the day after without a decision.
    const row = {
      id: "n1",
      slug: "agm-2026",
      title: "Annual General Meeting",
      excerpt: "All members are invited.",
      body: "The full article.",
      coverImageUrl: "https://example.test/agm.jpg",
      featured: true,
      publishedAt: new Date("2026-09-20T10:00:00Z"),
      category: { name: "Notices" },
      author: { name: "The Secretary" },
      internalReviewerNotes: "do not publish this line",
    };

    const shaped = newsSummary(row);
    expect(Object.keys(shaped).sort()).toEqual([
      "author",
      "category",
      "coverImageUrl",
      "excerpt",
      "featured",
      "id",
      "publishedAt",
      "slug",
      "title",
    ]);
    expect(JSON.stringify(shaped)).not.toContain("do not publish");
  });

  it("says whether an event has been and gone, rather than leaving the app to work it out", () => {
    const event = {
      id: "e1",
      slug: "agm",
      title: "AGM",
      venue: "North Campus Auditorium",
      description: "Everyone welcome.",
      startDate: new Date("2026-10-01T09:00:00Z"),
      endDate: new Date("2026-10-01T15:00:00Z"),
      registrationLink: null,
      contactInfo: null,
    };
    expect(eventSummary(event, new Date("2026-09-30T00:00:00Z")).isPast).toBe(false);
    expect(eventSummary(event, new Date("2026-10-02T00:00:00Z")).isPast).toBe(true);
    expect(eventDetail(event).description).toBe("Everyone welcome.");
  });

  it("tells the app whether to ask for another page", () => {
    expect(pageInfo({ page: 1, pageSize: 12, total: 30, totalPages: 3 }).hasMore).toBe(true);
    expect(pageInfo({ page: 3, pageSize: 12, total: 30, totalPages: 3 }).hasMore).toBe(false);
  });

  it("refuses to let one request pull the whole database", () => {
    expect(pageSizeFrom("500")).toBe(40);
    expect(pageSizeFrom("abc")).toBe(12);
    expect(pageSizeFrom("5")).toBe(5);
    expect(pageFrom("0")).toBe(1);
    expect(pageFrom("-3")).toBe(1);
    expect(pageFrom("99999")).toBe(500);
  });
});

describe("the bearer token on each request", () => {
  it("takes a bearer token however it was capitalised", () => {
    expect(bearerFrom("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(bearerFrom("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("refuses anything that isn't one", () => {
    expect(bearerFrom(null)).toBeNull();
    expect(bearerFrom("")).toBeNull();
    expect(bearerFrom("Bearer")).toBeNull();
    expect(bearerFrom("Bearer   ")).toBeNull();
    expect(bearerFrom("Basic abc")).toBeNull();
  });
});

describe("whether a phone should update itself", () => {
  const release = {
    version: "1.4.0",
    buildNumber: 140,
    apkUrl: "https://files.example.test/assn-1.4.0.apk",
    sha256: "a".repeat(64),
    sizeBytes: 28_000_000,
    changelog: "Faster news feed.",
    minimumBuild: 0,
    minAndroidSdk: 26,
    releasedAt: "2026-09-27T10:00:00.000Z",
  };

  it("leaves a phone alone when it is already up to date", () => {
    expect(decideUpdate({ currentBuild: 140, latest: release }).action).toBe("none");
    // Somebody testing tomorrow's build is not nagged to install yesterday's.
    expect(decideUpdate({ currentBuild: 141, latest: release }).action).toBe("none");
    expect(decideUpdate({ currentBuild: 1, latest: null }).action).toBe("none");
  });

  it("offers an update that can be dismissed", () => {
    expect(decideUpdate({ currentBuild: 130, latest: release }).action).toBe("offer");
  });

  it("only insists when the release says the old one is finished", () => {
    const verdict = decideUpdate({ currentBuild: 130, latest: { ...release, minimumBuild: 135 } });
    expect(verdict.action).toBe("require");
    expect(verdict.action === "require" && verdict.reason).toContain("no longer supported");
  });

  it("does not push an update onto a phone too old to install it", () => {
    // Better to say so than to fail at the last step, every single startup.
    const verdict = decideUpdate({ currentBuild: 130, androidSdk: 24, latest: release });
    expect(verdict.action).toBe("unsupported-device");
  });

  it("treats an app that sends no build number as very old indeed", () => {
    expect(buildFrom(null)).toBe(0);
    expect(buildFrom("not a number")).toBe(0);
    expect(buildFrom("140")).toBe(140);
  });

  it("knows what a version and a hash have to look like", () => {
    expect(VERSION_PATTERN.test("1.4.0")).toBe(true);
    expect(VERSION_PATTERN.test("v1.4.0")).toBe(false);
    expect(VERSION_PATTERN.test("1.4")).toBe(false);
    expect(SHA256_PATTERN.test("a".repeat(64))).toBe(true);
    expect(SHA256_PATTERN.test("a".repeat(63))).toBe(false);
    expect(SHA256_PATTERN.test(`${"z".repeat(64)}`)).toBe(false);
  });
});

describe("what a notification says", () => {
  it("leads with the headline and follows with the standfirst", () => {
    const message = newsMessage({
      title: "Annual General Meeting 2026",
      excerpt: "All members are invited to the North Campus Auditorium.",
      slug: "agm-2026",
    });
    expect(message.title).toBe("Annual General Meeting 2026");
    expect(message.body).toContain("North Campus Auditorium");
    expect(message.path).toBe("/news/agm-2026");
  });

  it("gives an event the two things somebody decides on: when, and where", () => {
    const message = eventMessage({
      title: "AGM",
      venue: "North Campus Auditorium",
      startDate: new Date("2026-10-01T09:00:00Z"),
      slug: "agm",
    });
    expect(message.body).toContain("1 October");
    expect(message.body).toContain("North Campus Auditorium");
  });

  it("cuts long text at a word, not through one", () => {
    const long = `${"word ".repeat(40)}end`;
    const cut = forLockScreen(long, 50);
    expect(cut.length).toBeLessThanOrEqual(51);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/wo…$/);
  });

  it("forgets an address only when it will never work again", () => {
    // Uninstalled or malformed: gone for good.
    expect(isDeadToken("UNREGISTERED")).toBe(true);
    expect(isDeadToken("NOT_FOUND")).toBe(true);
    expect(isDeadToken("INVALID_ARGUMENT")).toBe(true);
    // Firebase having a bad afternoon is not a reason to throw away
    // somebody's notifications for good.
    expect(isDeadToken("UNAVAILABLE")).toBe(false);
    expect(isDeadToken("INTERNAL")).toBe(false);
    expect(isDeadToken(null)).toBe(false);
  });

  it("sends in batches Firebase will accept", () => {
    const tokens = Array.from({ length: 1201 }, (_, i) => `t${i}`);
    const chunks = batches(tokens, 500);
    expect(chunks.map((c) => c.length)).toEqual([500, 500, 201]);
    expect(batches([], 500)).toEqual([]);
  });
});
