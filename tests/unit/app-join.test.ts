import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The mail-server check does a real DNS lookup, and example.com has a null
// MX record on purpose — so every address here would be refused. The check
// itself is the website's and is not what these tests are about.
vi.mock("@/lib/email-domain-check", () => ({ domainCanReceiveMail: vi.fn(async () => true) }));

const { db } = await import("@/lib/db");
const { isR2Configured } = await import("@/lib/storage/r2");
const { GET: getOptions } = await import("@/app/api/v1/app/join/options/route");
const { POST: postUpload } = await import("@/app/api/v1/app/join/upload/route");
const { POST: postStudent } = await import("@/app/api/v1/app/join/student/route");
const { POST: postAlumni } = await import("@/app/api/v1/app/join/alumni/route");
const { POST: postPatron } = await import("@/app/api/v1/app/join/patron/route");
const { POST: postLogin } = await import("@/app/api/v1/app/auth/login/route");
const { GET: getMe } = await import("@/app/api/v1/app/me/route");

/**
 * Joining from the app: the four sign-up forms, end to end, through the
 * real route handlers and the checks they share with the website.
 *
 * Needs the staging branch:
 *
 *   npx dotenv -e .env.staging.local -- npx vitest run tests/unit/app-join.test.ts
 *
 * File storage is deliberately unconfigured in tests (see setup.ts), so
 * uploads come back as "skip" — the same path local development takes —
 * and nothing here can reach the live bucket.
 */

const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);
const suite = HAS_DB ? describe : describe.skip;

const stamp = randomUUID().slice(0, 8);
const RUN_IP = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
const PASSWORD = "A-strong-passphrase-42";

function post(path: string, body: unknown, token?: string) {
  return new NextRequest(`https://portal.test/api/v1/app${path}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": RUN_IP,
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const read = async (response: Response) => ({
  status: response.status,
  body: (await response.json()) as Record<string, unknown>,
});

const made = { applications: [] as string[], alumni: [] as string[], patrons: [] as string[], emails: [] as string[] };

interface Options {
  student: {
    membershipTypes: { value: string }[];
    campuses: string[];
    regions: string[];
    specialNeedsCategories: string[];
    tracks: Record<"UNDERGRADUATE" | "POSTGRADUATE", { departments: string[]; programmes: string[]; levels: string[]; degreeCategories: string[] }>;
  };
  patron: { titles: string[] };
  passwordRule: string;
}
let options: Options;

function studentApplication(track: "UNDERGRADUATE" | "POSTGRADUATE", overrides: Record<string, unknown> = {}) {
  const t = options.student.tracks[track];
  const email = `test-join-${track.toLowerCase()}-${stamp}@example.com`;
  made.emails.push(email);
  return {
    track,
    membershipType: options.student.membershipTypes[0].value,
    firstName: "Join",
    lastName: "Tester",
    email,
    phone: "0240000002",
    dateOfBirth: "2002-04-11",
    gender: "FEMALE",
    campus: options.student.campuses[0],
    academicDepartment: t.departments[0],
    programme: t.programmes[0],
    level: t.levels[0],
    degreeCategory: t.degreeCategories[0] ?? "",
    indexNumber: `TJ${track[0]}${stamp.toUpperCase()}`,
    yearOfAdmission: 2025,
    department: options.student.specialNeedsCategories[0],
    specificSupportNeeds: [],
    residentialAddress: "Hall 3, North Campus",
    region: options.student.regions[0],
    emergencyContactName: "Ama Tester",
    emergencyContactPhone: "0240000003",
    agreedToTerms: true,
    ...(track === "POSTGRADUATE" ? { uewAlumnus: "no" } : {}),
    profilePictureToken: "",
    medicalReportToken: "",
    ...overrides,
  };
}

suite("joining the association from the app", () => {
  beforeAll(async () => {
    // A hard stop rather than a comment: nothing below may reach the live
    // bucket, and the upload tests only mean something if storage is off.
    expect(isR2Configured()).toBe(false);

    const { status, body } = await read(await getOptions());
    expect(status).toBe(200);
    options = body as unknown as Options;
  });

  afterAll(async () => {
    const links = [...made.applications, ...made.patrons];
    if (links.length) {
      await db.notification.deleteMany({ where: { OR: links.map((id) => ({ link: { contains: id } })) } });
    }
    if (made.applications.length) await db.membershipApplication.deleteMany({ where: { id: { in: made.applications } } });
    if (made.alumni.length) {
      await db.mobileDevice.deleteMany({ where: { alumniProfileId: { in: made.alumni } } });
      await db.alumniProfile.deleteMany({ where: { id: { in: made.alumni } } });
    }
    if (made.patrons.length) await db.patronProfile.deleteMany({ where: { id: { in: made.patrons } } });
    if (made.emails.length) await db.emailLog.deleteMany({ where: { to: { in: made.emails } } });
  });

  describe("what the forms offer", () => {
    it("gives both tracks their own departments, programmes and levels", () => {
      const { UNDERGRADUATE, POSTGRADUATE } = options.student.tracks;
      expect(UNDERGRADUATE.departments.length).toBeGreaterThan(0);
      expect(UNDERGRADUATE.levels).toContain("Level 100");
      expect(POSTGRADUATE.levels).toContain("Year 1");
      // Only postgraduates are asked for a degree category.
      expect(UNDERGRADUATE.degreeCategories).toEqual([]);
      expect(POSTGRADUATE.degreeCategories.length).toBeGreaterThan(0);
    });

    it("says what a password needs, in the website's words", () => {
      expect(options.passwordRule).toMatch(/at least 8 characters/);
    });
  });

  describe("attaching a document", () => {
    it("hands back a ticket for a passport photo or a medical report", async () => {
      for (const kind of ["passport", "medical"]) {
        const { status, body } = await read(
          await postUpload(post("/join/upload", { kind, filename: "a.jpg", mimeType: "image/jpeg", fileSize: 1000 })),
        );
        expect(status).toBe(200);
        // Storage is off in tests; this is the path local development takes.
        expect(body.mode).toBe("skip");
      }
    });

    it("refuses any other kind — a patron's document is not the public's to upload", async () => {
      const { status } = await read(
        await postUpload(post("/join/upload", { kind: "patron-document", filename: "a.pdf", mimeType: "application/pdf", fileSize: 10 })),
      );
      expect(status).toBe(400);
    });
  });

  describe("a student's application", () => {
    it("says which boxes are wrong, one message per box, rather than one lump", async () => {
      const { status, body } = await read(await postStudent(post("/join/student", { track: "UNDERGRADUATE" })));
      expect(status).toBe(422);
      expect(body.code).toBe("invalid_fields");
      const fieldErrors = body.fieldErrors as Record<string, string[]>;
      // Left out of the request altogether, not merely blank — and still
      // said in words, not "expected string, received undefined".
      expect(fieldErrors.firstName?.[0]).toBe("This is required.");
      expect(fieldErrors.agreedToTerms).toBeDefined();
      for (const messages of Object.values(fieldErrors)) {
        for (const message of messages) expect(message).not.toMatch(/received undefined|expected (string|number)/);
      }
    });

    it("takes an undergraduate application and leaves it waiting for review", async () => {
      const application = studentApplication("UNDERGRADUATE");
      const { status, body } = await read(await postStudent(post("/join/student", application)));
      expect({ status, error: body.error, fieldErrors: body.fieldErrors }).toEqual({ status: 200, error: undefined, fieldErrors: undefined });

      const saved = await db.membershipApplication.findUnique({ where: { indexNumber: application.indexNumber } });
      expect(saved?.status).toBe("PENDING");
      expect(saved?.applicationTrack).toBe("UNDERGRADUATE");
      if (saved) made.applications.push(saved.id);
    });

    it("refuses the same index number twice, and says so against that box", async () => {
      const again = studentApplication("UNDERGRADUATE");
      const { status, body } = await read(await postStudent(post("/join/student", again)));
      expect(status).toBe(422);
      expect((body.fieldErrors as Record<string, string[]>).indexNumber?.[0]).toMatch(/already exists/i);
    });

    it("asks a postgraduate who is a UEW graduate when and what they completed", async () => {
      const application = studentApplication("POSTGRADUATE", { uewAlumnus: "yes" });
      const { status, body } = await read(await postStudent(post("/join/student", application)));
      expect(status).toBe(422);
      const fieldErrors = body.fieldErrors as Record<string, string[]>;
      expect(fieldErrors.alumniGraduationYear).toBeDefined();
      expect(fieldErrors.alumniProgramme).toBeDefined();
    });

    it("takes a postgraduate application with a degree category", async () => {
      const application = studentApplication("POSTGRADUATE");
      const { status } = await read(await postStudent(post("/join/student", application)));
      expect(status).toBe(200);
      const saved = await db.membershipApplication.findUnique({ where: { indexNumber: application.indexNumber } });
      expect(saved?.applicationTrack).toBe("POSTGRADUATE");
      expect(saved?.degreeCategory).toBeTruthy();
      if (saved) made.applications.push(saved.id);
    });
  });

  describe("a graduate joining the alumni network", () => {
    const email = `test-join-alumni-${stamp}@example.com`;

    it("refuses a weak password with the website's own rule", async () => {
      const { status, body } = await read(
        await postAlumni(
          post("/join/alumni", {
            fullName: "Kofi Tester",
            email,
            phone: "0240000004",
            graduationYear: 2020,
            programme: "B.Ed. Special Education",
            password: "short",
            consent: true,
          }),
        ),
      );
      expect(status).toBe(422);
      expect((body.fieldErrors as Record<string, string[]>).password?.[0]).toMatch(/at least 8 characters/);
    });

    it("is signed straight in, as on the website, and the session works", async () => {
      made.emails.push(email);
      const { status, body } = await read(
        await postAlumni(
          post("/join/alumni", {
            fullName: "Kofi Tester",
            email,
            phone: "0240000004",
            graduationYear: 2020,
            programme: "B.Ed. Special Education",
            password: PASSWORD,
            consent: true,
            device: { deviceName: "Vitest phone" },
          }),
        ),
      );
      expect(status).toBe(200);
      const identity = body.identity as { audience: string; id: string };
      expect(identity.audience).toBe("ALUMNI");
      made.alumni.push(identity.id);

      // The very next thing the app does.
      const me = await read(
        await getMe(
          new NextRequest("https://portal.test/api/v1/app/me", {
            headers: { authorization: `Bearer ${body.accessToken as string}`, "x-forwarded-for": RUN_IP },
          }),
        ),
      );
      expect(me.status).toBe(200);
      expect(me.body.audience).toBe("ALUMNI");
    });

    it("says an address is already registered, against the email box", async () => {
      const { status, body } = await read(
        await postAlumni(
          post("/join/alumni", {
            fullName: "Kofi Again",
            email,
            phone: "0240000004",
            graduationYear: 2020,
            programme: "B.Ed. Special Education",
            password: PASSWORD,
            consent: true,
          }),
        ),
      );
      expect(status).toBe(422);
      expect((body.fieldErrors as Record<string, string[]>).email?.[0]).toMatch(/already exists/i);
    });
  });

  describe("a patron offering support", () => {
    const email = `test-join-patron-${stamp}@example.com`;
    const patron = {
      title: "Dr.",
      fullName: "Efua Tester",
      email,
      phone: "0240000005",
      occupation: "Physician",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      consent: true,
    };

    it("catches passwords that don't match", async () => {
      const { status, body } = await read(await postPatron(post("/join/patron", { ...patron, confirmPassword: "Different-42" })));
      expect(status).toBe(422);
      expect((body.fieldErrors as Record<string, string[]>).confirmPassword?.[0]).toMatch(/do not match/i);
    });

    it("is recorded for review, and cannot sign in until approved", async () => {
      made.emails.push(email);
      const { status } = await read(await postPatron(post("/join/patron", patron)));
      expect(status).toBe(200);

      const saved = await db.patronProfile.findUnique({ where: { email } });
      expect(saved?.status).toBe("PENDING");
      if (saved) made.patrons.push(saved.id);

      const login = await read(await postLogin(post("/auth/login", { identifier: email, password: PASSWORD })));
      expect(login.status).toBe(401);
    });
  });
});
