import { describe, expect, it } from "vitest";
import { CLOSES_HOURS_AFTER, OPENS_MINUTES_BEFORE, callWindow, meetingDomainOf } from "@/lib/mentorship-call";

/**
 * When a mentor and a student can talk.
 *
 * A mentorship here is often a student in Winneba and a graduate who has
 * moved away, so the call is the point of the session — but a room that is
 * open at all hours is a room either of them could wander into weeks later
 * expecting to find the other.
 */

const at = (iso: string) => new Date(iso);
const session = { scheduledFor: at("2026-10-01T14:00:00Z"), status: "SCHEDULED" };

describe("when a session's call room is open", () => {
  it("opens a quarter of an hour early, so nobody is late fiddling with a microphone", () => {
    expect(callWindow(session, at("2026-10-01T13:44:00Z")).open).toBe(false);
    expect(callWindow(session, at("2026-10-01T13:45:00Z")).open).toBe(true);
    expect(OPENS_MINUTES_BEFORE).toBe(15);
  });

  it("stays open well past the hour, because a good conversation runs over", () => {
    expect(callWindow(session, at("2026-10-01T16:59:00Z")).open).toBe(true);
    expect(callWindow(session, at("2026-10-01T17:01:00Z")).open).toBe(false);
    expect(CLOSES_HOURS_AFTER).toBe(3);
  });

  it("says when it will open rather than just refusing", () => {
    const early = callWindow(session, at("2026-10-01T09:00:00Z"));
    expect(early.open).toBe(false);
    expect(early.open === false && early.reason).toBe("too-early");
    expect(early.open === false && early.message).toContain("opens 15 minutes before");
  });

  it("is shut for a session that was cancelled or already marked done", () => {
    for (const status of ["CANCELLED", "COMPLETED"]) {
      const shut = callWindow({ ...session, status }, at("2026-10-01T14:00:00Z"));
      expect(shut.open).toBe(false);
      expect(shut.open === false && shut.reason).toBe("not-scheduled");
    }
  });
});

describe("which meeting service the calls use", () => {
  it("falls back to the free one nobody needs an account for", () => {
    expect(meetingDomainOf("")).toBe("meet.jit.si");
    expect(meetingDomainOf(null)).toBe("meet.jit.si");
    expect(meetingDomainOf("   ")).toBe("meet.jit.si");
  });

  it("takes whatever the executive typed, however they typed it", () => {
    expect(meetingDomainOf("meet.example.org")).toBe("meet.example.org");
    expect(meetingDomainOf("https://meet.example.org")).toBe("meet.example.org");
    expect(meetingDomainOf("https://meet.example.org/")).toBe("meet.example.org");
  });
});
