import { beforeEach, describe, expect, it, vi } from "vitest";

// Nothing here touches a real database or sends a real email.
const mocks = vi.hoisted(() => {
  const db = {
    member: { findUnique: vi.fn() },
    alumniProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userRole: { upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    alumniPasswordResetToken: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, sendEmail: vi.fn(async () => ({ delivered: true })) };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/email/client", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/services/content-service", () => ({
  getEmailBrand: async () => ({ siteTitle: "Test Association", logoUrl: null }),
  getSiteSettings: async () => ({}),
}));

import { grantAlumniStandingForApprovedApplicant } from "@/lib/services/user-admin-service";
import {
  CAMPUSES,
  POSTGRAD_DEGREE_CATEGORIES,
  POSTGRAD_LEVELS,
  enrollmentSchema,
  uewAlumnusDetailsFrom,
  uewAlumnusFieldsFor,
} from "@/lib/validations/membership";

const { db } = mocks;

function member(overrides: { alumniProfile?: object | null } = {}) {
  return {
    id: "member-1",
    email: "ama@example.com",
    phone: "0240000000",
    firstName: "Ama",
    middleName: null,
    lastName: "Mensah",
    profileImageUrl: "https://cdn.example/members/ama.jpg",
    user: { id: "user-1", roles: [{ role: "MEMBER" }], alumniProfile: overrides.alumniProfile ?? null },
  };
}

const grant = () =>
  grantAlumniStandingForApprovedApplicant({
    memberId: "member-1",
    graduationYear: 2019,
    programme: "BEd Special Education",
    adminId: "admin-1",
    inviteBaseUrl: "https://assnuew.example/alumni/reset-password",
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: typeof db) => Promise<unknown>)(db) : Promise.all(arg as Promise<unknown>[]),
  );
  db.alumniProfile.create.mockResolvedValue({ id: "alumni-new" });
  db.alumniProfile.findUnique.mockResolvedValue(null);
});

describe("grantAlumniStandingForApprovedApplicant", () => {
  it("creates a linked alumni profile with the details they gave, adds the ALUMNI role, and sends the set-password email", async () => {
    db.member.findUnique.mockResolvedValue(member());

    expect(await grant()).toBe("granted");

    expect(db.alumniProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "ama@example.com",
        fullName: "Ama Mensah",
        graduationYear: 2019,
        programme: "BEd Special Education",
        userId: "user-1",
        sourceMemberId: "member-1",
        mustSetPassword: true,
      }),
    });
    expect(db.userRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: "user-1", role: "ALUMNI" } }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "GRANT_DUAL_STATUS", adminId: "admin-1" }),
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ama@example.com", template: "alumni-dual-membership-invite" }),
    );
  });

  it("links an alumni profile already on the same account without creating another or emailing a new password link", async () => {
    db.member.findUnique.mockResolvedValue(member({ alumniProfile: { id: "alumni-old", userId: "user-1" } }));

    expect(await grant()).toBe("already-alumni");

    expect(db.alumniProfile.create).not.toHaveBeenCalled();
    expect(db.alumniProfile.update).toHaveBeenCalledWith({
      where: { id: "alumni-old" },
      data: { userId: "user-1", sourceMemberId: "member-1" },
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("attaches an older Alumni Portal registration with the same email that isn't on any account yet", async () => {
    db.member.findUnique.mockResolvedValue(member());
    db.alumniProfile.findUnique.mockResolvedValue({ id: "alumni-legacy", userId: null });

    expect(await grant()).toBe("linked-existing-alumni");

    expect(db.alumniProfile.update).toHaveBeenCalledWith({
      where: { id: "alumni-legacy" },
      data: { userId: "user-1", sourceMemberId: "member-1" },
    });
    expect(db.alumniProfile.create).not.toHaveBeenCalled();
  });

  it("leaves an alumni profile that belongs to a different account alone, and records why", async () => {
    db.member.findUnique.mockResolvedValue(member());
    db.alumniProfile.findUnique.mockResolvedValue({ id: "alumni-other", userId: "user-2" });

    expect(await grant()).toBe("conflict");

    expect(db.alumniProfile.update).not.toHaveBeenCalled();
    expect(db.alumniProfile.create).not.toHaveBeenCalled();
    expect(db.userRole.upsert).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ note: expect.stringContaining("different account") }),
    });
  });
});

describe("the postgraduate form's UEW graduate question", () => {
  const valid = {
    track: "POSTGRADUATE",
    membershipType: "REGULAR",
    firstName: "Ama",
    lastName: "Mensah",
    email: "ama@example.com",
    phone: "0240000000",
    dateOfBirth: "1995-04-02",
    gender: "FEMALE",
    campus: CAMPUSES[0],
    degreeCategory: POSTGRAD_DEGREE_CATEGORIES[0],
    academicDepartment: "Special Education",
    programme: "MPhil Special Education",
    level: POSTGRAD_LEVELS[0],
    indexNumber: "8261234567",
    yearOfAdmission: "2026",
    department: "Deaf",
    medicalReportKey: "pending",
    residentialAddress: "Winneba",
    region: "Central",
    emergencyContactName: "Kofi Mensah",
    emergencyContactPhone: "0240000001",
    agreedToTerms: true,
  };

  it("keeps the graduation year and programme for a UEW graduate", () => {
    const parsed = enrollmentSchema.safeParse({
      ...valid,
      uewAlumnus: "yes",
      alumniGraduationYear: "2019",
      alumniProgramme: "BEd Special Education",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && uewAlumnusFieldsFor(parsed.data)).toEqual({
      uewAlumnus: { graduationYear: 2019, programme: "BEd Special Education" },
    });
  });

  it("asks for the graduation year and programme when they answer yes", () => {
    const parsed = enrollmentSchema.safeParse({ ...valid, uewAlumnus: "yes", alumniGraduationYear: "", alumniProgramme: "" });
    expect(parsed.success).toBe(false);
    const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};
    expect(errors.alumniGraduationYear).toBeDefined();
    expect(errors.alumniProgramme).toBeDefined();
  });

  it("saves nothing extra for someone who answers no, or for undergraduates", () => {
    const no = enrollmentSchema.safeParse({ ...valid, uewAlumnus: "no" });
    expect(no.success && uewAlumnusFieldsFor(no.data)).toBeUndefined();

    const undergraduate = enrollmentSchema.safeParse({
      ...valid,
      track: "UNDERGRADUATE",
      degreeCategory: "",
      level: "Level 100",
      uewAlumnus: "yes",
      alumniGraduationYear: "2019",
      alumniProgramme: "BEd Special Education",
    });
    expect(undergraduate.success && uewAlumnusFieldsFor(undergraduate.data)).toBeUndefined();
  });

  it("still accepts a form opened before the question existed", () => {
    expect(enrollmentSchema.safeParse(valid).success).toBe(true);
  });

  it("reads the stored details back, and ignores anything malformed", () => {
    expect(uewAlumnusDetailsFrom({ uewAlumnus: { graduationYear: 2019, programme: " BEd Special Education " } })).toEqual({
      graduationYear: 2019,
      programme: "BEd Special Education",
    });
    expect(uewAlumnusDetailsFrom(null)).toBeNull();
    expect(uewAlumnusDetailsFrom({ uewAlumnus: { graduationYear: "2019", programme: "BEd" } })).toBeNull();
    expect(uewAlumnusDetailsFrom({ other: true })).toBeNull();
  });
});
