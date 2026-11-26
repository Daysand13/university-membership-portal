import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The app's profile, support, barrier report, ID card and session booking
 * routes, against the staging database.
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/app-member-screens.test.ts
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

suite("the app's member screens", () => {
  const stamp = randomUUID().slice(0, 8);
  const ids = { member: "", other: "", alumni: "", mentorship: "" };
  const tokens = { student: "", other: "", mentor: "" };
  let db: typeof import("@/lib/db").db;

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    const { startAppSession } = await import("@/lib/services/mobile-device-service");
    const member = (i: number) =>
      db.member.create({
        data: {
          firstName: "Screens",
          lastName: `Tester${i}`,
          email: `test-app-screens-${stamp}-${i}@example.com`,
          phone: "0240000000",
          indexNumber: `TAS${stamp.toUpperCase()}${i}`,
          programme: "B.Ed. Special Education",
          department: "Visually Impaired",
          level: "Level 300",
          campus: "Winneba Main Campus",
          yearOfAdmission: 2023,
          gender: "FEMALE",
          status: "ACTIVE",
          passwordHash: "not-used-in-this-test",
        },
      });
    ids.member = (await member(1)).id;
    ids.other = (await member(2)).id;
    ids.alumni = (
      await db.alumniProfile.create({
        data: {
          fullName: "Kwame Screens-Mentor",
          email: `test-app-screens-${stamp}-alumni@example.com`,
          phone: "0240000000",
          passwordHash: "not-used-in-this-test",
          graduationYear: 2017,
          programme: "B.Ed. Special Education",
          status: "ACTIVE",
          willingToMentor: true,
        },
      })
    ).id;
    ids.mentorship = (await db.mentorship.create({ data: { memberId: ids.member, alumniId: ids.alumni, status: "ACTIVE" } })).id;
    tokens.student = (await startAppSession({ audience: "MEMBER", subjectId: ids.member })).accessToken;
    tokens.other = (await startAppSession({ audience: "MEMBER", subjectId: ids.other })).accessToken;
    tokens.mentor = (await startAppSession({ audience: "ALUMNI", subjectId: ids.alumni })).accessToken;
  });

  afterAll(async () => {
    const members = [ids.member, ids.other].filter(Boolean);
    await db.mobileDevice.deleteMany({ where: { OR: [{ memberId: { in: members } }, { alumniProfileId: ids.alumni }] } });
    await db.supportRequest.deleteMany({ where: { memberId: { in: members } } });
    await db.barrierReport.deleteMany({ where: { memberId: { in: members } } });
    await db.duesPayment.deleteMany({ where: { memberId: { in: members } } });
    if (ids.mentorship) await db.mentorship.deleteMany({ where: { id: ids.mentorship } });
    if (ids.alumni) await db.alumniProfile.deleteMany({ where: { id: ids.alumni } });
    await db.member.deleteMany({ where: { id: { in: members } } });
  });

  it("shows a student their profile and saves the contact details they may change, and nothing else", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/profile/route");
    const before = await read(await GET(request("/profile", { token: tokens.student })));
    expect(before.body.profile).toMatchObject({ indexNumber: `TAS${stamp.toUpperCase()}1`, editable: { phone: "0240000000" } });

    const missing = await read(await POST(request("/profile", { method: "POST", body: { phone: " " }, token: tokens.student })));
    expect(missing.status).toBe(422);

    const saved = await read(
      await POST(
        request("/profile", {
          method: "POST",
          token: tokens.student,
          body: { phone: "0551234567", region: "Central", residentialAddress: "North Campus hostel", emergencyContactName: "Ama", emergencyContactPhone: "0201112222", firstName: "Hacked", indexNumber: "X" },
        }),
      ),
    );
    expect(saved.status).toBe(200);
    const row = await db.member.findUniqueOrThrow({ where: { id: ids.member } });
    expect(row).toMatchObject({ phone: "0551234567", region: "Central", emergencyContactName: "Ama", firstName: "Screens" });
    expect(row.indexNumber).toBe(`TAS${stamp.toUpperCase()}1`);

    const { GET: asMentor } = await import("@/app/api/v1/app/profile/route");
    expect((await asMentor(request("/profile", { token: tokens.mentor }))).status).toBe(403);
  });

  it("files a support request, lists it, and withdraws it - but nobody else's", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/support/route");
    const { POST: withdraw } = await import("@/app/api/v1/app/support/[id]/withdraw/route");

    const welfareWithoutAmount = await read(
      await POST(request("/support", { method: "POST", token: tokens.student, body: { type: "WELFARE", details: "I need help paying for braille textbooks this term." } })),
    );
    expect(welfareWithoutAmount.status).toBe(422);
    expect((welfareWithoutAmount.body.fieldErrors as Record<string, string[]>).amount).toBeTruthy();

    const filed = await read(
      await POST(request("/support", { method: "POST", token: tokens.student, body: { type: "WELFARE", details: "I need help paying for braille textbooks this term.", amount: "350" } })),
    );
    expect(filed.status).toBe(200);
    const listed = await read(await GET(request("/support", { token: tokens.student })));
    expect(listed.body.requests).toEqual([expect.objectContaining({ id: filed.body.id, typeLabel: expect.any(String), amountRequested: expect.stringContaining("350"), canWithdraw: true })]);
    expect((listed.body.types as unknown[]).length).toBeGreaterThan(1);

    expect((await withdraw(request(`/support/${filed.body.id}/withdraw`, { method: "POST", token: tokens.other }), params(String(filed.body.id)))).status).toBe(409);
    expect((await withdraw(request(`/support/${filed.body.id}/withdraw`, { method: "POST", token: tokens.student }), params(String(filed.body.id)))).status).toBe(200);
    expect(((await read(await GET(request("/support", { token: tokens.student })))).body.requests as unknown[]).length).toBe(0);
  });

  it("files a barrier report and withdraws it; a ticket for evidence comes only to a student", async () => {
    const { GET, POST } = await import("@/app/api/v1/app/barrier-reports/route");
    const { POST: withdraw } = await import("@/app/api/v1/app/barrier-reports/[id]/withdraw/route");
    const { POST: upload } = await import("@/app/api/v1/app/barrier-reports/upload/route");

    const first = await read(await GET(request("/barrier-reports", { token: tokens.student })));
    const category = (first.body.categories as { value: string }[])[0].value;

    const tooShort = await read(await POST(request("/barrier-reports", { method: "POST", token: tokens.student, body: { title: "Ramp", description: "Broken", category } })));
    expect(tooShort.status).toBe(422);

    const filed = await read(
      await POST(
        request("/barrier-reports", {
          method: "POST",
          token: tokens.student,
          body: { title: "Ramp at the library is blocked", description: "Bicycles are chained across the wheelchair ramp every morning.", category, location: "Main library" },
        }),
      ),
    );
    expect(filed).toMatchObject({ status: 200, body: { attachments: 0 } });

    const ticket = await upload(request("/barrier-reports/upload", { method: "POST", token: tokens.mentor, body: { kind: "barrier-evidence", filename: "a.jpg", mimeType: "image/jpeg", fileSize: 1000 } }));
    expect(ticket.status).toBe(403);
    const wrongKind = await upload(request("/barrier-reports/upload", { method: "POST", token: tokens.student, body: { kind: "passport", filename: "a.jpg", mimeType: "image/jpeg", fileSize: 1000 } }));
    expect(wrongKind.status).toBe(400);

    expect((await withdraw(request(`/barrier-reports/${filed.body.id}/withdraw`, { method: "POST", token: tokens.other }), params(String(filed.body.id)))).status).toBe(409);
    expect((await withdraw(request(`/barrier-reports/${filed.body.id}/withdraw`, { method: "POST", token: tokens.student }), params(String(filed.body.id)))).status).toBe(200);
  });

  it("issues no ID card until this year's dues are paid, and says why", async () => {
    const { GET } = await import("@/app/api/v1/app/id-card/route");
    const reply = await read(await GET(request("/id-card", { token: tokens.student })));
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ status: "dues_unpaid", message: expect.stringContaining("dues") });
    expect(reply.body.front).toBeUndefined();
  });

  it("issues both sides of the card, and its details as words, once dues are paid", async () => {
    const { getCurrentAcademicYear } = await import("@/lib/services/dues-service");
    await db.duesPayment.create({
      data: {
        memberId: ids.member,
        academicYear: getCurrentAcademicYear(),
        tierLabel: "Test",
        amountPesewas: 100,
        status: "SUCCESS",
        reference: `test-app-screens-${stamp}`,
        paidAt: new Date(),
      },
    });
    const { GET } = await import("@/app/api/v1/app/id-card/route");
    const reply = await read(await GET(request("/id-card", { token: tokens.student })));
    expect(reply.body).toMatchObject({ status: "ready", details: { indexNumber: `TAS${stamp.toUpperCase()}1`, programme: "B.Ed. Special Education" } });
    for (const side of ["front", "back"] as const) {
      const png = Buffer.from(String(reply.body[side]), "base64");
      expect(png.subarray(1, 4).toString("latin1"), side).toBe("PNG");
      expect(png.length, side).toBeGreaterThan(5_000);
    }
  }, 60_000);

  it("books a session from either side, and refuses one in the past or in somebody else's mentorship", async () => {
    const { POST } = await import("@/app/api/v1/app/mentorship/[id]/sessions/route");
    const when = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16);

    const booked = await read(await POST(request(`/mentorship/${ids.mentorship}/sessions`, { method: "POST", token: tokens.student, body: { scheduledFor: when, topic: "Exam access arrangements" } }), params(ids.mentorship)));
    expect(booked.status).toBe(200);
    expect(String(booked.body.scheduledFor)).toBe(`${when}:00.000Z`);

    const byMentor = await POST(request(`/mentorship/${ids.mentorship}/sessions`, { method: "POST", token: tokens.mentor, body: { scheduledFor: when } }), params(ids.mentorship));
    expect(byMentor.status).toBe(200);

    const past = await POST(request(`/mentorship/${ids.mentorship}/sessions`, { method: "POST", token: tokens.student, body: { scheduledFor: "2020-01-01T10:00" } }), params(ids.mentorship));
    expect(past.status).toBe(422);
    const stranger = await POST(request(`/mentorship/${ids.mentorship}/sessions`, { method: "POST", token: tokens.other, body: { scheduledFor: when } }), params(ids.mentorship));
    expect(stranger.status).toBe(409);

    expect(await db.mentorshipSession.count({ where: { mentorshipId: ids.mentorship } })).toBe(2);
  });
});
