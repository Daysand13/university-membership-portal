import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The app's opportunity board and patron messages, against staging.
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/app-opportunities-patron-messages.test.ts
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;
const RUN_IP = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;

function request(path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": RUN_IP };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  return new NextRequest(`https://portal.test/api/v1/app${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as Record<string, unknown> });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

suite("the opportunity board and patron messages in the app", () => {
  const stamp = randomUUID().slice(0, 8);
  const ids = { member: "", alumni: "", patron: "", otherPatron: "", approved: "" };
  const tokens = { student: "", graduate: "", patron: "", otherPatron: "" };
  let db: typeof import("@/lib/db").db;

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    const { startAppSession } = await import("@/lib/services/mobile-device-service");
    ids.member = (
      await db.member.create({
        data: {
          firstName: "Board",
          lastName: "Reader",
          email: `test-app-board-${stamp}@example.com`,
          phone: "0240000000",
          indexNumber: `TAB${stamp.toUpperCase()}`,
          programme: "B.Ed. Special Education",
          department: "Hearing Impaired",
          level: "Level 400",
          campus: "Winneba Main Campus",
          yearOfAdmission: 2022,
          gender: "MALE",
          status: "ACTIVE",
          passwordHash: "not-used-in-this-test",
        },
      })
    ).id;
    ids.alumni = (
      await db.alumniProfile.create({
        data: {
          fullName: "Efua Board-Poster",
          email: `test-app-board-${stamp}-alumni@example.com`,
          phone: "0240000000",
          passwordHash: "not-used-in-this-test",
          graduationYear: 2016,
          programme: "B.Ed. Special Education",
          status: "ACTIVE",
        },
      })
    ).id;
    const patron = (i: number) =>
      db.patronProfile.create({
        data: {
          fullName: `Patron Tester ${i}`,
          email: `test-app-patron-${stamp}-${i}@example.com`,
          phone: "0240000000",
          occupation: "Lecturer",
          passwordHash: "not-used-in-this-test",
          status: "APPROVED",
        },
      });
    ids.patron = (await patron(1)).id;
    ids.otherPatron = (await patron(2)).id;
    ids.approved = (
      await db.opportunity.create({
        data: {
          alumniId: ids.alumni,
          postedByName: "Efua Board-Poster",
          title: `Test internship ${stamp}`,
          organization: "Ghana Blind Union",
          type: "INTERNSHIP",
          description: "A three-month internship supporting accessible publishing.",
          applyEmail: "jobs@example.com",
          status: "APPROVED",
        },
      })
    ).id;
    tokens.student = (await startAppSession({ audience: "MEMBER", subjectId: ids.member })).accessToken;
    tokens.graduate = (await startAppSession({ audience: "ALUMNI", subjectId: ids.alumni })).accessToken;
    tokens.patron = (await startAppSession({ audience: "PATRON", subjectId: ids.patron })).accessToken;
    tokens.otherPatron = (await startAppSession({ audience: "PATRON", subjectId: ids.otherPatron })).accessToken;
  });

  afterAll(async () => {
    await db.mobileDevice.deleteMany({
      where: { OR: [{ memberId: ids.member }, { alumniProfileId: ids.alumni }, { patronId: { in: [ids.patron, ids.otherPatron] } }] },
    });
    await db.opportunity.deleteMany({ where: { alumniId: ids.alumni } });
    await db.patronThread.deleteMany({ where: { patronId: { in: [ids.patron, ids.otherPatron] } } });
    await db.patronProfile.deleteMany({ where: { id: { in: [ids.patron, ids.otherPatron] } } });
    if (ids.alumni) await db.alumniProfile.deleteMany({ where: { id: ids.alumni } });
    if (ids.member) await db.member.deleteMany({ where: { id: ids.member } });
  });

  it("shows students the approved openings, and lets only graduates post", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/opportunities/route");
    const board = await read(await GET(request("/opportunities", { token: tokens.student })));
    expect(board.body.canPost).toBe(false);
    expect((board.body.opportunities as { id: string }[]).some((o) => o.id === ids.approved)).toBe(true);
    expect(board.body.mine).toEqual([]);

    const fromStudent = await POST(request("/opportunities", { method: "POST", token: tokens.student, body: {} }));
    expect(fromStudent.status).toBe(403);
    expect((await GET(request("/opportunities", { token: tokens.patron }))).status).toBe(403);
  });

  it("takes a graduate's opening into review, needs a way to apply, and lets them withdraw it", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/opportunities/route");
    const { POST: withdraw } = await import("@/app/api/v1/app/opportunities/[id]/withdraw/route");
    const opening = {
      title: "Braille transcriber",
      organization: "Accessible Books Ghana",
      type: "JOB",
      description: "Transcribing course readers into braille for university students, part time.",
    };

    const noWayToApply = await read(await POST(request("/opportunities", { method: "POST", token: tokens.graduate, body: opening })));
    expect(noWayToApply.status).toBe(422);
    expect((noWayToApply.body.fieldErrors as Record<string, string[]>).applyUrl).toBeTruthy();

    const posted = await read(await POST(request("/opportunities", { method: "POST", token: tokens.graduate, body: { ...opening, applyUrl: "https://example.com/apply" } })));
    expect(posted.status).toBe(200);

    const board = await read(await GET(request("/opportunities", { token: tokens.graduate })));
    expect(board.body.canPost).toBe(true);
    expect(board.body.mine).toEqual(expect.arrayContaining([expect.objectContaining({ id: posted.body.id, status: "PENDING", canWithdraw: true })]));
    // Not on the board until an administrator approves it.
    expect((board.body.opportunities as { id: string }[]).some((o) => o.id === posted.body.id)).toBe(false);

    expect((await withdraw(request(`/opportunities/${ids.approved}/withdraw`, { method: "POST", token: tokens.graduate }), params(ids.approved))).status).toBe(409);
    expect((await withdraw(request(`/opportunities/${posted.body.id}/withdraw`, { method: "POST", token: tokens.graduate }), params(String(posted.body.id)))).status).toBe(200);
  });

  it("lets a patron write to the executive, read the thread and reply - but only from the list, and only their own", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/patron-messages/route");
    const thread = await import("@/app/api/v1/app/patron-messages/[id]/route");

    const list = await read(await GET(request("/patron-messages", { token: tokens.patron })));
    const contacts = list.body.contacts as string[];
    expect(contacts.length).toBeGreaterThan(0);

    const nowhere = await read(await POST(request("/patron-messages", { method: "POST", token: tokens.patron, body: { addressedTo: "Somebody's private inbox", subject: "Hello", body: "A message." } })));
    expect(nowhere.status).toBe(422);

    const started = await read(
      await POST(request("/patron-messages", { method: "POST", token: tokens.patron, body: { addressedTo: contacts[0], subject: "Library donation", body: "I'd like to donate braille readers." } })),
    );
    expect(started.status).toBe(200);
    const id = String(started.body.id);

    const replied = await thread.POST(request(`/patron-messages/${id}`, { method: "POST", token: tokens.patron, body: { body: "When could I bring them?" } }), params(id));
    expect(replied.status).toBe(200);

    const opened = await read(await thread.GET(request(`/patron-messages/${id}`, { token: tokens.patron }), params(id)));
    expect(opened.body).toMatchObject({ subject: "Library donation", addressedTo: contacts[0] });
    expect((opened.body.messages as { fromYou: boolean }[]).map((m) => m.fromYou)).toEqual([true, true]);

    expect((await thread.GET(request(`/patron-messages/${id}`, { token: tokens.otherPatron }), params(id))).status).toBe(404);
    expect((await thread.POST(request(`/patron-messages/${id}`, { method: "POST", token: tokens.otherPatron, body: { body: "Hi" } }), params(id))).status).toBe(404);
    expect((await GET(request("/patron-messages", { token: tokens.student }))).status).toBe(403);
  }, 120_000);
});
