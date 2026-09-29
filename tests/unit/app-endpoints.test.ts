import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { startAppSession } from "@/lib/services/mobile-device-service";
import { GET as getNews } from "@/app/api/v1/app/news/route";
import { GET as getEvents } from "@/app/api/v1/app/events/route";
import { GET as getLibrary } from "@/app/api/v1/app/library/route";
import { GET as getElections } from "@/app/api/v1/app/elections/route";
import { GET as getMe } from "@/app/api/v1/app/me/route";
import { GET as getAlumni } from "@/app/api/v1/app/alumni/route";
import { GET as getDues } from "@/app/api/v1/app/dues/route";
import { GET as getVersion } from "@/app/api/v1/app/version/route";
import { POST as postLogin } from "@/app/api/v1/app/auth/login/route";
import { POST as postRefresh } from "@/app/api/v1/app/auth/refresh/route";
import { POST as postLogout } from "@/app/api/v1/app/auth/logout/route";
import { POST as postDevices } from "@/app/api/v1/app/devices/route";

/**
 * The Android API, exercised as the app will exercise it: the real route
 * handlers, the real services, a real database.
 *
 * These need a database — run them against the staging branch:
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run
 *
 * Without one they are skipped rather than failed, because the guard in
 * setup.ts deliberately points DATABASE_URL at a dead address unless
 * somebody has opted in.
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

const BASE = "https://portal.test/api/v1/app";

/**
 * A different caller every run.
 *
 * Sign-ins are limited per address as well as per identifier, and without
 * this every test request looked like the same anonymous caller — so a
 * second run inside ten minutes was refused by a limiter doing exactly its
 * job. A real phone has an address; these may as well too.
 */
const RUN_IP = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;

function headersFor(token?: string, json = false): Record<string, string> {
  return {
    "x-forwarded-for": RUN_IP,
    ...(json ? { "content-type": "application/json" } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function get(path: string, token?: string): NextRequest {
  return new NextRequest(`${BASE}${path}`, { headers: headersFor(token) });
}

function post(path: string, body: unknown, token?: string): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method: "POST",
    headers: headersFor(token, true),
    body: JSON.stringify(body),
  });
}

const json = async (response: Response) => (await response.json()) as Record<string, unknown>;

// A throwaway student, made here and removed again at the end.
const stamp = randomUUID().slice(0, 8);
const EMAIL = `app-test-${stamp}@example.com`;
const INDEX = `APPTEST${stamp.toUpperCase()}`;
const PASSWORD = "A-strong-passphrase-42";

let memberId: string;
let userId: string;
/**
 * One sign-in, shared.
 *
 * Signing in is limited to eight attempts per identifier in ten minutes —
 * the same limit as the website's — and a test file that signs in for
 * every case walks straight into it. That limit is right, so the tests
 * bend instead: the cases that are *about* signing in use the endpoint,
 * and everything else reuses this token or mints a session directly.
 */
let sharedToken: string;
let sharedDeviceId: string;

suite("the Android API, against a real database", () => {
  beforeAll(async () => {
    // A member with the User account and MEMBER role that approval gives
    // every real one. An earlier version of this made a bare Member row,
    // which no live record looks like — and so tested a sign-in nobody
    // would ever attempt.
    const hash = await hashPassword(PASSWORD);
    const user = await db.user.create({
      data: {
        email: EMAIL,
        firstName: "App",
        lastName: "Tester",
        passwordHash: hash,
        roles: { create: { role: "MEMBER" } },
      },
    });
    userId = user.id;

    const member = await db.member.create({
      data: {
        userId: user.id,
        firstName: "App",
        lastName: "Tester",
        email: EMAIL,
        phone: "0240000000",
        indexNumber: INDEX,
        programme: "B.Ed. Special Education",
        department: "Special Education",
        level: "Level 300",
        campus: "North Campus",
        yearOfAdmission: 2023,
        gender: "FEMALE",
        status: "ACTIVE",
        passwordHash: hash,
        applicationTrack: "UNDERGRADUATE",
      },
    });
    memberId = member.id;

    const login = await json(await postLogin(post("/auth/login", { identifier: EMAIL, password: PASSWORD })));
    sharedToken = login.accessToken as string;
    sharedDeviceId = login.deviceId as string;
  });

  afterAll(async () => {
    await db.mobileDevice.deleteMany({ where: { memberId } });
    await db.member.deleteMany({ where: { id: memberId } });
    await db.userRole.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  describe("what anybody may read without signing in", () => {
    it("lists published news, and says whether there is more", async () => {
      const body = await json(await getNews(get("/news?pageSize=5")));
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.news)).toBe(true);
      expect(body).toHaveProperty("hasMore");
      expect((body.news as unknown[]).length).toBeLessThanOrEqual(5);
    });

    it("gives out only the named fields of an article", async () => {
      const body = await json(await getNews(get("/news?pageSize=1")));
      const [first] = body.news as Record<string, unknown>[];
      if (!first) return; // An empty staging branch is not a failure.
      expect(Object.keys(first).sort()).toEqual([
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
    });

    it("lists events, upcoming and past", async () => {
      const upcoming = await json(await getEvents(get("/events")));
      expect(upcoming.ok).toBe(true);
      expect(upcoming.when).toBe("upcoming");
      const past = await json(await getEvents(get("/events?when=past")));
      expect(past.when).toBe("past");
    });

    it("lists the public library and its categories", async () => {
      const body = await json(await getLibrary(get("/library")));
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.documents)).toBe(true);
      expect(Array.isArray(body.categories)).toBe(true);
    });

    it("answers the update check even with no release published", async () => {
      const body = await json(await getVersion(get("/version?build=100&sdk=33")));
      expect(body.ok).toBe(true);
      expect(["none", "offer", "require", "unsupported-device"]).toContain(body.action);
    });

    it("never offers a way to vote", async () => {
      const body = await json(await getElections(get("/elections")));
      expect(body.ok).toBe(true);
      expect(body.votingInApp).toBe(false);
      // Results exist only once the commission publishes them.
      const election = body.election as { resultsPublic?: boolean } | null;
      if (election && !election.resultsPublic) expect(body.results).toBeNull();
    });
  });

  describe("what needs signing in", () => {
    it("turns away a request with no token", async () => {
      const response = await getMe(get("/me"));
      expect(response.status).toBe(401);
      expect((await json(response)).code).toBe("no_token");
    });

    it("signs a student in and tells them apart from anybody else", async () => {
      // The sign-in done in beforeAll, checked through what it returned.
      expect(sharedToken).toBeTruthy();
      const me = await json(await getMe(get("/me", sharedToken)));
      expect((me.profile as { indexNumber: string }).indexNumber).toBe(INDEX);
      expect(me.audience).toBe("MEMBER");
    });

    it("refuses the wrong password, and says nothing about whether the account exists", async () => {
      const wrongPassword = await json(
        await postLogin(post("/auth/login", { identifier: EMAIL, password: "not-the-password" })),
      );
      const noSuchPerson = await json(
        await postLogin(post("/auth/login", { identifier: "nobody-here@example.com", password: "whatever" })),
      );
      expect(wrongPassword.ok).toBe(false);
      expect(noSuchPerson.ok).toBe(false);
      // The same words either way: telling them apart is how somebody
      // discovers which addresses the association holds.
      expect(wrongPassword.error).toBe(noSuchPerson.error);
    });

    it("gives a student their dues, and refuses to guess for anybody else", async () => {
      const body = await json(await getDues(get("/dues", sharedToken)));
      expect(body.ok).toBe(true);
      expect(body).toHaveProperty("academicYear");
      expect((body.fee as { tierLabel: string }).tierLabel).toBe("Level 300");
      expect(body.paid).toBe(false);
    });

    it("hands out the directory without handing out everybody's contact details", async () => {
      const body = await json(await getAlumni(get("/alumni", sharedToken)));
      expect(body.ok).toBe(true);
      const [first] = body.alumni as Record<string, unknown>[];
      if (!first) return;
      expect(first).not.toHaveProperty("email");
      expect(first).not.toHaveProperty("phone");
    });
  });

  describe("staying signed in, and stopping", () => {
    it("swaps a refresh token for a new pair, and spends the old one", async () => {
      // Minted directly: this is about refreshing, not about signing in.
      const session = await startAppSession({ audience: "MEMBER", subjectId: memberId });
      const first = session.refreshToken;

      const refreshed = await json(await postRefresh(post("/auth/refresh", { refreshToken: first })));
      expect(refreshed.ok).toBe(true);
      expect(refreshed.refreshToken).not.toBe(first);

      // The spent one is no longer any use — and presenting it means two
      // phones are holding one token, so the whole device is cut off
      // rather than the one request merely refused.
      const reused = await json(await postRefresh(post("/auth/refresh", { refreshToken: first })));
      expect(reused.ok).toBe(false);

      // Which is the part that matters: the token the thief would have
      // taken is dead too, not just the one they copied.
      const afterReuse = await json(
        await postRefresh(post("/auth/refresh", { refreshToken: refreshed.refreshToken as string })),
      );
      expect(afterReuse.ok).toBe(false);

      const device = await db.mobileDevice.findUnique({ where: { id: session.deviceId } });
      expect(device?.revokedAt).not.toBeNull();
      expect(device?.revokedReason).toContain("re-used");
    });

    it("tells a stale token apart from one that was never real", async () => {
      // Both are refused, but only the first means somebody has a copy —
      // so only the first takes the device down with it.
      const live = await startAppSession({ audience: "MEMBER", subjectId: memberId });
      const nonsense = await json(
        await postRefresh(post("/auth/refresh", { refreshToken: "not-a-token-anybody-ever-held" })),
      );
      expect(nonsense.ok).toBe(false);

      const stillGood = await db.mobileDevice.findUnique({ where: { id: live.deviceId } });
      expect(stillGood?.revokedAt).toBeNull();
    });

    it("signs out this phone and nothing else", async () => {
      const one = await startAppSession({ audience: "MEMBER", subjectId: memberId });
      const two = await startAppSession({ audience: "MEMBER", subjectId: memberId });

      await postLogout(post("/auth/logout", {}, one.accessToken));

      const signedOut = await getMe(get("/me", one.accessToken));
      expect(signedOut.status).toBe(401);
      expect((await json(signedOut)).code).toBe("device_revoked");

      // The other phone carries on.
      const stillIn = await getMe(get("/me", two.accessToken));
      expect(stillIn.status).toBe(200);
    });

    it("remembers where to send notifications, and can be told to stop", async () => {
      const token = sharedToken;
      const deviceId = sharedDeviceId;
      const pushToken = `test-push-${randomUUID()}`;

      const registered = await json(
        await postDevices(post("/devices", { pushToken, preferences: { news: true, events: false } }, token)),
      );
      expect(registered.ok).toBe(true);

      const device = await db.mobileDevice.findUnique({ where: { id: deviceId } });
      expect(device?.pushToken).toBe(pushToken);
      expect(device?.notifyEvents).toBe(false);

      await postDevices(post("/devices", { pushToken: null }, token));
      const quiet = await db.mobileDevice.findUnique({ where: { id: deviceId } });
      expect(quiet?.pushToken).toBeNull();
      // Still signed in — asking for silence is not signing out.
      expect(quiet?.revokedAt).toBeNull();
    });
  });
});
