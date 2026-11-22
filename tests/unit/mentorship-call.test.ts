import { generateKeyPairSync, randomUUID } from "node:crypto";
import { decodeProtectedHeader, jwtVerify } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_MS,
  LIVE_GRACE_MS,
  callEndedAt,
  describeCallLength,
  isCallLive,
  meetingDomainOf,
  meetingMode,
  minutesTalked,
  shouldRing,
  whoIsIn,
  type CallTimes,
} from "@/lib/mentorship-call";

/**
 * Mentorship calls: no time window, no time limit, and an honest record.
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/mentorship-call.test.ts
 */

const ring = vi.hoisted(() => ({ call: vi.fn(), reminder: vi.fn() }));
vi.mock("@/lib/services/portal-notification-service", () => ({
  notifyOfMentorshipCall: ring.call,
  notifyOfSessionReminder: ring.reminder,
}));

const at = (iso: string) => new Date(iso);
const minutes = (n: number) => n * 60_000;

describe("whether a call is still going", () => {
  const start = at("2026-11-22T14:00:00Z");
  const later = (n: number) => new Date(start.getTime() + minutes(n));
  const call = (over: Partial<CallTimes> = {}): CallTimes => ({
    startedAt: start,
    answeredAt: null,
    lastSeenAt: start,
    studentSeenAt: start,
    mentorSeenAt: null,
    endedAt: null,
    ...over,
  });

  it("is going while somebody checks in, and over a couple of minutes after they stop", () => {
    expect(isCallLive(call(), new Date(start.getTime() + HEARTBEAT_MS))).toBe(true);
    expect(isCallLive(call(), new Date(start.getTime() + LIVE_GRACE_MS))).toBe(true);
    expect(isCallLive(call(), new Date(start.getTime() + LIVE_GRACE_MS + 1))).toBe(false);
  });

  it("knows who is in it, and somebody who pressed Leave is out at once", () => {
    const both = call({ mentorSeenAt: start });
    expect(whoIsIn(both, start)).toEqual({ student: true, mentor: true });
    const studentLeft = call({ studentSeenAt: null, mentorSeenAt: start });
    expect(whoIsIn(studentLeft, start)).toEqual({ student: false, mentor: true });
    // Nobody left in it: over straight away, not two minutes later.
    expect(isCallLive(call({ studentSeenAt: null }), start)).toBe(false);
  });

  it("has no limit on how long it can go on", () => {
    // Five hours of check-ins: still live, because nothing counts from the start.
    expect(isCallLive(call({ studentSeenAt: later(300), lastSeenAt: later(300) }), later(300))).toBe(true);
  });

  it("ended at the last check-in, not when somebody noticed", () => {
    const quiet = call({ studentSeenAt: later(34), lastSeenAt: later(34) });
    expect(callEndedAt(quiet, later(64))).toEqual(later(34));
    expect(callEndedAt(quiet, later(34))).toBeNull();
  });

  it("counts the talking from when the second person came in", () => {
    const done = call({ answeredAt: later(2), lastSeenAt: later(36), studentSeenAt: null });
    expect(minutesTalked(done, later(60))).toBe(34);
    expect(describeCallLength(done, later(60))).toBe("34 minutes");
  });

  it("describes calls in words a history list can use", () => {
    const gone = { studentSeenAt: null };
    expect(describeCallLength(call(gone), later(600))).toBe("not answered");
    expect(describeCallLength(call(), start)).toBe("ringing");
    expect(describeCallLength(call({ ...gone, answeredAt: start, lastSeenAt: new Date(start.getTime() + 20_000) }), later(600))).toBe(
      "under a minute",
    );
    expect(describeCallLength(call({ ...gone, answeredAt: start, lastSeenAt: later(61) }), later(600))).toBe("1 hour 1 minute");
    expect(describeCallLength(call({ ...gone, answeredAt: start, lastSeenAt: later(120) }), later(600))).toBe("2 hours");
  });

  it("rings the other side once, not every time somebody drops out and back in", () => {
    expect(shouldRing(null, start)).toBe(true);
    expect(shouldRing(start, later(9))).toBe(false);
    expect(shouldRing(start, later(10))).toBe(true);
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

  it("never embeds the public meet.jit.si, which cuts embedded calls off after five minutes", () => {
    expect(meetingMode("meet.jit.si", false)).toBe("new-tab");
    expect(meetingMode("meet.example.org", false)).toBe("embed");
    expect(meetingMode("meet.jit.si", true)).toBe("jaas");
  });
});

describe("a pass into a JaaS room", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  it("reads the key with its line breaks written as \\n, as an environment variable has them", async () => {
    const { jaasConfig } = await import("@/lib/server/meeting");
    const config = jaasConfig({
      JAAS_APP_ID: "vpaas-magic-cookie-abc",
      JAAS_API_KEY_ID: "vpaas-magic-cookie-abc/123",
      JAAS_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
    } as unknown as NodeJS.ProcessEnv);
    expect(config?.privateKey).toBe(pem.trim());
    expect(jaasConfig({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("is for one room, makes only the mentor a moderator, and turns recording off", async () => {
    const { jaasPass } = await import("@/lib/server/meeting");
    const config = { appId: "vpaas-magic-cookie-abc", keyId: "vpaas-magic-cookie-abc/123", privateKey: pem };
    const now = at("2026-11-22T14:00:00Z");

    const mentor = await jaasPass({ config, room: "assnuewroom", user: { id: "alumni-1", name: "Ama Mentor" }, moderator: true, now });
    const student = await jaasPass({ config, room: "assnuewroom", user: { id: "member-1", name: "Kofi Student" }, moderator: false, now });

    expect(decodeProtectedHeader(mentor)).toMatchObject({ alg: "RS256", kid: "vpaas-magic-cookie-abc/123", typ: "JWT" });
    const { payload } = await jwtVerify(mentor, publicKey, { audience: "jitsi", issuer: "chat", currentDate: now });
    expect(payload).toMatchObject({ sub: "vpaas-magic-cookie-abc", room: "assnuewroom" });
    const context = payload.context as { user: Record<string, string>; features: Record<string, string> };
    expect(context.user).toMatchObject({ name: "Ama Mentor", moderator: "true", email: "" });
    expect(context.features).toMatchObject({ recording: "false", livestreaming: "false", transcription: "false" });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(8 * 3600);

    const { payload: theirs } = await jwtVerify(student, publicKey, { currentDate: now });
    expect((theirs.context as { user: Record<string, string> }).user.moderator).toBe("false");
  });
});

describe("the name of a mentorship's room", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET ||= "test-secret-for-room-names";
  });

  it("is the same every time, different per mentorship, and letters and digits only", async () => {
    const { callRoomForMentorship } = await import("@/lib/server/call-room");
    const a = callRoomForMentorship("mentorship-a");
    expect(callRoomForMentorship("mentorship-a")).toBe(a);
    expect(callRoomForMentorship("mentorship-b")).not.toBe(a);
    expect(a).toMatch(/^assnuew[A-Za-z0-9]{28}$/);
    expect(a).not.toContain("mentorship-a");
  });
});

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const withDb = HAS_DB ? describe : describe.skip;

withDb("calls between a real student and mentor", () => {
  const stamp = randomUUID().slice(0, 8);
  const ids = { member: "", outsider: "", alumni: "", mentorship: "" };
  let db: typeof import("@/lib/db").db;
  let service: typeof import("@/lib/services/mentorship-call-service");

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    service = await import("@/lib/services/mentorship-call-service");
    const member = (i: number) =>
      db.member.create({
        data: {
          firstName: "Call",
          lastName: `Tester${i}`,
          email: `test-call-${stamp}-${i}@example.com`,
          phone: "0240000000",
          indexNumber: `TC${stamp.toUpperCase()}${i}`,
          programme: "B.Ed. Special Education",
          department: "Visually Impaired",
          level: "Level 200",
          campus: "Winneba Main Campus",
          yearOfAdmission: 2024,
          gender: "FEMALE",
          status: "ACTIVE",
          passwordHash: "not-used-in-this-test",
        },
      });
    ids.member = (await member(1)).id;
    ids.outsider = (await member(2)).id;
    ids.alumni = (
      await db.alumniProfile.create({
        data: {
          fullName: "Ama Mentor",
          email: `test-call-mentor-${stamp}@example.com`,
          phone: "0240000000",
          passwordHash: "not-used-in-this-test",
          graduationYear: 2019,
          programme: "B.Ed. Special Education",
          status: "ACTIVE",
          willingToMentor: true,
        },
      })
    ).id;
    ids.mentorship = (
      await db.mentorship.create({ data: { memberId: ids.member, alumniId: ids.alumni, status: "ACTIVE" } })
    ).id;
  });

  beforeEach(() => {
    ring.call.mockReset();
    ring.reminder.mockReset();
  });

  afterAll(async () => {
    if (ids.mentorship) await db.mentorship.deleteMany({ where: { id: ids.mentorship } });
    if (ids.alumni) await db.alumniProfile.deleteMany({ where: { id: ids.alumni } });
    await db.member.deleteMany({ where: { id: { in: [ids.member, ids.outsider].filter(Boolean) } } });
  });

  it("starts a call, tells the mentor once, and puts them both in the same one", async () => {
    const t0 = at("2031-03-04T14:00:00Z");
    const first = await service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "student", actorId: ids.member, withVideo: false, now: t0 });
    expect(first.started).toBe(true);
    expect(ring.call).toHaveBeenCalledTimes(1);
    expect(ring.call.mock.calls[0][0]).toMatchObject({ startedBy: "STUDENT", withVideo: false });

    const t1 = new Date(t0.getTime() + minutes(1));
    const second = await service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "mentor", actorId: ids.alumni, withVideo: true, now: t1 });
    expect(second).toEqual({ callId: first.callId, started: false });
    expect(ring.call).toHaveBeenCalledTimes(1);

    const row = await db.mentorshipCall.findUniqueOrThrow({ where: { id: first.callId } });
    expect(row.answeredAt).toEqual(t1);

    // An hour of conversation, checking in throughout: never cut off.
    let t = t1;
    for (let i = 0; i < 80; i += 1) {
      t = new Date(t.getTime() + HEARTBEAT_MS);
      if (i % 20 === 0) expect(await service.callCheckIn({ callId: first.callId, side: "mentor", actorId: ids.alumni, now: t })).toEqual({ live: true });
      else await db.mentorshipCall.update({ where: { id: first.callId }, data: { lastSeenAt: t, studentSeenAt: t, mentorSeenAt: t } });
    }
    await service.leaveMentorshipCall({ callId: first.callId, side: "student", actorId: ids.member, now: t });
    const half = await db.mentorshipCall.findUniqueOrThrow({ where: { id: first.callId } });
    expect(whoIsIn(half, t)).toEqual({ student: false, mentor: true });

    await service.leaveMentorshipCall({ callId: first.callId, side: "mentor", actorId: ids.alumni, now: t });
    const done = await db.mentorshipCall.findUniqueOrThrow({ where: { id: first.callId } });
    // Both have pressed Leave: over at once, not two minutes later.
    expect(isCallLive(done, t)).toBe(false);
    expect(minutesTalked(done, new Date(t.getTime() + minutes(10)))).toBe(60);
  });

  it("starts a fresh call after the last one went quiet, without ringing again straight away", async () => {
    const last = await db.mentorshipCall.findFirstOrThrow({ where: { mentorshipId: ids.mentorship }, orderBy: { startedAt: "desc" } });
    const later = new Date(last.lastSeenAt.getTime() + minutes(1));
    const again = await service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "mentor", actorId: ids.alumni, withVideo: true, now: later });
    expect(again.started).toBe(true);
    expect(again.callId).not.toBe(last.id);
    // The student was rung over an hour ago, so this one rings too.
    expect(ring.call).toHaveBeenCalledTimes(1);

    const soon = new Date(later.getTime() + LIVE_GRACE_MS + minutes(1));
    await service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "mentor", actorId: ids.alumni, withVideo: true, now: soon });
    expect(ring.call).toHaveBeenCalledTimes(1);
  });

  it("lets nobody outside the mentorship start, join or keep a call open", async () => {
    await expect(
      service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "student", actorId: ids.outsider, withVideo: true }),
    ).rejects.toThrow("couldn't be found");
    const latest = await db.mentorshipCall.findFirstOrThrow({ where: { mentorshipId: ids.mentorship }, orderBy: { startedAt: "desc" } });
    expect(await service.callCheckIn({ callId: latest.id, side: "student", actorId: ids.outsider, now: latest.lastSeenAt })).toEqual({ live: false });
  });

  it("reminds both sides on the morning of a session, once", async () => {
    const morning = at("2031-03-05T06:00:00Z");
    const session = await db.mentorshipSession.create({
      data: { mentorshipId: ids.mentorship, scheduledFor: at("2031-03-05T15:00:00Z"), topic: "Braille textbooks" },
    });
    const tomorrow = await db.mentorshipSession.create({
      data: { mentorshipId: ids.mentorship, scheduledFor: at("2031-03-06T09:00:00Z") },
    });

    await service.sendTodaysSessionReminders(morning);
    const reminded = ring.reminder.mock.calls.map(([p]) => p.session.id);
    expect(reminded).toContain(session.id);
    expect(reminded).not.toContain(tomorrow.id);

    ring.reminder.mockReset();
    await service.sendTodaysSessionReminders(morning);
    expect(ring.reminder.mock.calls.map(([p]) => p.session.id)).not.toContain(session.id);
  });

  it("has no calls once the mentorship has ended", async () => {
    await db.mentorship.update({ where: { id: ids.mentorship }, data: { status: "ENDED" } });
    await expect(
      service.joinMentorshipCall({ mentorshipId: ids.mentorship, side: "student", actorId: ids.member, withVideo: true }),
    ).rejects.toThrow("has ended");
  });
});
