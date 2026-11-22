import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Mentorship and account recovery from the Android app: the real route
 * handlers against the staging database.
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/app-mentorship.test.ts
 */

const sent = vi.hoisted(() => ({ message: vi.fn(), resets: vi.fn() }));
vi.mock("@/lib/services/portal-notification-service", async (original) => ({
  ...(await original<typeof import("@/lib/services/portal-notification-service")>()),
  notifyOfMentorshipMessage: sent.message,
}));
vi.mock("@/lib/services/membership-service", async (original) => ({
  ...(await original<typeof import("@/lib/services/membership-service")>()),
  requestPasswordReset: (email: string) => sent.resets("member", email),
}));
vi.mock("@/lib/services/alumni-service", async (original) => ({
  ...(await original<typeof import("@/lib/services/alumni-service")>()),
  requestAlumniPasswordReset: (email: string) => sent.resets("alumni", email),
}));
vi.mock("@/lib/services/patron-service", async (original) => ({
  ...(await original<typeof import("@/lib/services/patron-service")>()),
  requestPatronPasswordReset: (email: string) => sent.resets("patron", email),
}));

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;
const BASE = "https://portal.test/api/v1/app";
const RUN_IP = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;

function request(path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": RUN_IP };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  return new NextRequest(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as Record<string, unknown> });

suite("mentorship from the app", () => {
  const stamp = randomUUID().slice(0, 8);
  const ids = { member: "", outsider: "", alumni: "", mentorship: "" };
  const tokens = { student: "", mentor: "", outsider: "" };
  let db: typeof import("@/lib/db").db;

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    const { startAppSession } = await import("@/lib/services/mobile-device-service");
    const member = (i: number) =>
      db.member.create({
        data: {
          firstName: "App",
          lastName: `Mentee${i}`,
          email: `test-app-mentor-${stamp}-${i}@example.com`,
          phone: "0240000000",
          indexNumber: `TAM${stamp.toUpperCase()}${i}`,
          programme: "B.Ed. Special Education",
          department: "Hearing Impaired",
          level: "Level 300",
          campus: "Winneba Main Campus",
          yearOfAdmission: 2023,
          gender: "MALE",
          status: "ACTIVE",
          passwordHash: "not-used-in-this-test",
        },
      });
    ids.member = (await member(1)).id;
    ids.outsider = (await member(2)).id;
    ids.alumni = (
      await db.alumniProfile.create({
        data: {
          fullName: "Esi App-Mentor",
          email: `test-app-mentor-${stamp}-alumni@example.com`,
          phone: "0240000000",
          passwordHash: "not-used-in-this-test",
          graduationYear: 2018,
          programme: "B.Ed. Special Education",
          status: "ACTIVE",
          willingToMentor: true,
        },
      })
    ).id;
    ids.mentorship = (
      await db.mentorship.create({
        data: { memberId: ids.member, alumniId: ids.alumni, status: "ACTIVE", unreadByStudent: true, goals: "Sign language interpreting" },
      })
    ).id;
    tokens.student = (await startAppSession({ audience: "MEMBER", subjectId: ids.member })).accessToken;
    tokens.mentor = (await startAppSession({ audience: "ALUMNI", subjectId: ids.alumni })).accessToken;
    tokens.outsider = (await startAppSession({ audience: "MEMBER", subjectId: ids.outsider })).accessToken;
  });

  afterAll(async () => {
    await db.mobileDevice.deleteMany({ where: { OR: [{ memberId: { in: [ids.member, ids.outsider] } }, { alumniProfileId: ids.alumni }] } });
    if (ids.mentorship) await db.mentorship.deleteMany({ where: { id: ids.mentorship } });
    if (ids.alumni) await db.alumniProfile.deleteMany({ where: { id: ids.alumni } });
    await db.member.deleteMany({ where: { id: { in: [ids.member, ids.outsider].filter(Boolean) } } });
  });

  it("lists a student's mentor, and a mentor's student", async () => {
    const { GET } = await import("@/app/api/v1/app/mentorship/route");
    const mine = await read(await GET(request("/mentorship", { token: tokens.student })));
    expect(mine.status).toBe(200);
    expect(mine.body).toMatchObject({ side: "student" });
    expect(mine.body.mentorships).toEqual([
      expect.objectContaining({ id: ids.mentorship, otherName: "Esi App-Mentor", status: "ACTIVE", unread: true, otherIsInCall: false }),
    ]);

    const theirs = await read(await GET(request("/mentorship", { token: tokens.mentor })));
    expect(theirs.body).toMatchObject({ side: "mentor" });
    expect((theirs.body.mentorships as { otherName: string }[])[0].otherName).toBe("App Mentee1");
  });

  it("sends a message, and both sides read the same conversation", async () => {
    const { POST } = await import("@/app/api/v1/app/mentorship/[id]/messages/route");
    const { GET } = await import("@/app/api/v1/app/mentorship/[id]/route");
    const params = { params: Promise.resolve({ id: ids.mentorship }) };

    const empty = await read(await POST(request(`/mentorship/${ids.mentorship}/messages`, { method: "POST", body: { body: "  " }, token: tokens.student }), params));
    expect(empty.status).toBe(422);

    const ok = await read(await POST(request(`/mentorship/${ids.mentorship}/messages`, { method: "POST", body: { body: "Hello from the app" }, token: tokens.student }), params));
    expect(ok).toMatchObject({ status: 200, body: { sent: true } });
    expect(sent.message).toHaveBeenCalledTimes(1);

    const mentorView = await read(await GET(request(`/mentorship/${ids.mentorship}`, { token: tokens.mentor }), params));
    expect(mentorView.body).toMatchObject({ side: "mentor", otherName: "App Mentee1", callPath: `/alumni/mentorship/${ids.mentorship}/call` });
    expect(mentorView.body.messages).toEqual([expect.objectContaining({ body: "Hello from the app", mine: false })]);

    const studentView = await read(await GET(request(`/mentorship/${ids.mentorship}`, { token: tokens.student }), params));
    expect(studentView.body.messages).toEqual([expect.objectContaining({ mine: true })]);
    // Opening it marked it read, as the website does.
    expect((await db.mentorship.findUniqueOrThrow({ where: { id: ids.mentorship } })).unreadByStudent).toBe(false);
  });

  it("shows nobody a conversation that isn't theirs", async () => {
    const { GET } = await import("@/app/api/v1/app/mentorship/[id]/route");
    const { POST } = await import("@/app/api/v1/app/mentorship/[id]/messages/route");
    const params = { params: Promise.resolve({ id: ids.mentorship }) };
    expect((await GET(request(`/mentorship/${ids.mentorship}`, { token: tokens.outsider }), params)).status).toBe(404);
    const posted = await POST(request(`/mentorship/${ids.mentorship}/messages`, { method: "POST", body: { body: "Hi" }, token: tokens.outsider }), params);
    expect(posted.status).toBe(409);
    expect((await GET(request(`/mentorship/${ids.mentorship}`), params)).status).toBe(401);
  });
});

suite("forgotten password from the app", () => {
  it("asks all three portals, and answers the same whether or not anybody has that address", async () => {
    const { POST } = await import("@/app/api/v1/app/auth/forgot/route");
    const email = `test-forgot-${randomUUID().slice(0, 8)}@example.com`;
    const reply = await read(await POST(request("/auth/forgot", { method: "POST", body: { email: email.toUpperCase() } })));
    expect(reply.status).toBe(200);
    expect(String(reply.body.message)).toContain("If that address belongs to an account");
    expect(sent.resets.mock.calls.map(([portal, to]) => [portal, to]).sort()).toEqual([
      ["alumni", email],
      ["member", email],
      ["patron", email],
    ]);

    const bad = await read(await POST(request("/auth/forgot", { method: "POST", body: { email: "not-an-address" } })));
    expect(bad.status).toBe(422);
  });
});
