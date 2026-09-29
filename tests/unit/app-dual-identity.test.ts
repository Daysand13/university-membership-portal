import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { POST as postLogin } from "@/app/api/v1/app/auth/login/route";
import { GET as getMe } from "@/app/api/v1/app/me/route";
import { POST as postDevices } from "@/app/api/v1/app/devices/route";

/**
 * Signing in as somebody who is both a student and a graduate.
 *
 * Reported twice from a real phone: choose a portal, and you land back on
 * the signed-out screen. Nothing had ever exercised this path — the other
 * app tests sign in as a plain student, who is never asked to choose.
 *
 * This runs the calls in the order the app makes them, so a failure here
 * says which of them it is.
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/app-dual-identity.test.ts
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

const stamp = randomUUID().slice(0, 8);
const EMAIL = `dual-${stamp}@example.com`;
const INDEX = `DUAL${stamp.toUpperCase()}`;
const PASSWORD = "A-strong-passphrase-42";
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

const read = async (response: Response) => ({
  status: response.status,
  body: (await response.json()) as Record<string, unknown>,
});

const ids = { user: "", member: "", alumni: "" };

suite("a student who is also a graduate, signing in on the app", () => {
  beforeAll(async () => {
    const hash = await hashPassword(PASSWORD);
    const user = await db.user.create({
      data: {
        email: EMAIL,
        firstName: "Dual",
        lastName: "Tester",
        passwordHash: hash,
        roles: { create: [{ role: "MEMBER" }, { role: "ALUMNI" }] },
      },
    });
    ids.user = user.id;

    const member = await db.member.create({
      data: {
        userId: user.id,
        firstName: "Dual",
        lastName: "Tester",
        email: EMAIL,
        phone: "0240000001",
        indexNumber: INDEX,
        programme: "M.Phil. Special Education",
        department: "Special Education",
        level: "Year 1",
        campus: "North Campus",
        yearOfAdmission: 2025,
        gender: "MALE",
        status: "ACTIVE",
        passwordHash: hash,
        applicationTrack: "POSTGRADUATE",
      },
    });
    ids.member = member.id;

    const alumni = await db.alumniProfile.create({
      data: {
        userId: user.id,
        fullName: "Dual Tester",
        email: EMAIL,
        phone: "0240000001",
        passwordHash: hash,
        graduationYear: 2024,
        programme: "B.Ed. Special Education",
        status: "ACTIVE",
      },
    });
    ids.alumni = alumni.id;
  });

  afterAll(async () => {
    await db.mobileDevice.deleteMany({
      where: { OR: [{ memberId: ids.member }, { alumniProfileId: ids.alumni }] },
    });
    if (ids.alumni) await db.alumniProfile.deleteMany({ where: { id: ids.alumni } });
    if (ids.member) await db.member.deleteMany({ where: { id: ids.member } });
    if (ids.user) {
      await db.userRole.deleteMany({ where: { userId: ids.user } });
      await db.user.deleteMany({ where: { id: ids.user } });
    }
  });

  it("is asked which portal, and given both", async () => {
    const { status, body } = await read(
      await postLogin(request("/auth/login", { method: "POST", body: { identifier: EMAIL, password: PASSWORD } })),
    );
    expect(status).toBe(200);
    const choices = (body.chooseFrom as { audience: string }[]).map((c) => c.audience).sort();
    expect(choices).toEqual(["ALUMNI", "MEMBER"]);
  });

  for (const audience of ["ALUMNI", "MEMBER"] as const) {
    it(`chooses ${audience}, and stays signed in through everything the app does next`, async () => {
      const login = await read(
        await postLogin(
          request("/auth/login", {
            method: "POST",
            body: { identifier: EMAIL, password: PASSWORD, audience, device: { deviceName: "Vitest phone" } },
          }),
        ),
      );
      expect(login.status).toBe(200);
      expect(login.body.accessToken).toBeTruthy();
      expect((login.body.identity as { audience: string }).audience).toBe(audience);
      const token = login.body.accessToken as string;

      // 1. The app loads /me straight after signing in.
      const me = await read(await getMe(request("/me", { token })));
      expect({ status: me.status, code: me.body.code }).toEqual({ status: 200, code: undefined });
      expect(me.body.audience).toBe(audience);

      // 2. Then registers for notifications.
      const devices = await read(
        await postDevices(request("/devices", { method: "POST", token, body: { pushToken: `fcm-${stamp}-${"x".repeat(40)}` } })),
      );
      expect({ status: devices.status, code: devices.body.code }).toEqual({ status: 200, code: undefined });

      // 3. And the portal asks for /me again when it draws.
      const again = await read(await getMe(request("/me", { token })));
      expect(again.status).toBe(200);
    });
  }

  it("works with the index number as well as the email", async () => {
    const { status, body } = await read(
      await postLogin(
        request("/auth/login", { method: "POST", body: { identifier: INDEX, password: PASSWORD, audience: "ALUMNI" } }),
      ),
    );
    // An index number belongs to the student record; whether it also opens
    // the graduate one is what this pins down.
    expect(status).toBe(200);
    expect((body.identity as { audience: string }).audience).toBe("ALUMNI");
  });
});
