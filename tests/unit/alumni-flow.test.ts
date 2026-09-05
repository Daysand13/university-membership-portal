import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  registerAlumni,
  authenticateAlumni,
  promoteMemberToAlumni,
  DuplicateAlumniEmailError,
  InvalidAlumniCredentialsError,
  AlumniPasswordNotSetError,
} from "@/lib/services/alumni-service";
import { submitApplication, approveApplication } from "@/lib/services/membership-service";
import type { EnrollmentInput } from "@/lib/validations/membership";
import type { AlumniRegisterInput } from "@/lib/validations/alumni";

// Exercises the real service layer against the real local Postgres database,
// same approach as membership-flow.test.ts.

function buildAlumniRegistration(overrides: Partial<AlumniRegisterInput> = {}): AlumniRegisterInput {
  const unique = randomUUID().slice(0, 8);
  return {
    fullName: "Test Alumnus",
    email: `alumni-${unique}@example.com`,
    phone: "0244000000",
    graduationYear: 2020,
    programme: "Special Education",
    profession: "Teacher",
    currentLocation: "Accra",
    password: "AlumniPass123",
    consent: true,
    ...overrides,
  };
}

function buildMemberApplication(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  const unique = randomUUID().slice(0, 8);
  return {
    track: "UNDERGRADUATE",
    firstName: "Grad",
    lastName: "Uating",
    dateOfBirth: new Date("2000-01-01"),
    gender: "FEMALE",
    phone: "0244222222",
    email: `grad-${unique}@example.com`,
    indexNumber: `GRAD/${unique}`,
    programme: "Special Education",
    department: "Visual Impairment",
    academicDepartment: "Special Education",
    specificSupportNeeds: [],
    medicalReportKey: "test-medical-report-key",
    level: "Level 400",
    campus: "Winneba Main Campus",
    yearOfAdmission: 2020,
    residentialAddress: "1 Test Street",
    region: "Greater Accra",
    emergencyContactName: "Emergency Contact",
    emergencyContactPhone: "0244333333",
    membershipType: "REGULAR",
    agreedToTerms: true,
    ...overrides,
  };
}

const createdAlumniIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdMemberIds: string[] = [];
let testAdminId: string;

describe("alumni network flow", () => {
  it("sets up a throwaway admin", async () => {
    const admin = await db.adminUser.upsert({
      where: { email: "vitest-admin@example.com" },
      update: {},
      create: {
        name: "Vitest Admin",
        email: "vitest-admin@example.com",
        passwordHash: "not-used-in-this-test",
        role: "SUPER_ADMIN",
      },
    });
    testAdminId = admin.id;
    expect(admin.id).toBeTruthy();
  });

  it("a self-registered alumnus can then sign in with their email and password", async () => {
    const input = buildAlumniRegistration();
    const alumni = await registerAlumni(input);
    createdAlumniIds.push(alumni.id);

    const authenticated = await authenticateAlumni(input.email, input.password);
    expect(authenticated.id).toBe(alumni.id);

    await expect(authenticateAlumni(input.email, "WrongPassword1")).rejects.toBeInstanceOf(
      InvalidAlumniCredentialsError,
    );
  });

  it("registering twice with the same email is rejected", async () => {
    const input = buildAlumniRegistration();
    const alumni = await registerAlumni(input);
    createdAlumniIds.push(alumni.id);

    await expect(registerAlumni(input)).rejects.toBeInstanceOf(DuplicateAlumniEmailError);
  });

  it("marking a member as graduated creates a linked alumni account using their email, with no usable password yet", async () => {
    const appInput = buildMemberApplication();
    const application = await submitApplication(appInput, null, null);
    createdApplicationIds.push(application.id);
    const member = await approveApplication({
      applicationId: application.id,
      adminId: testAdminId,
      loginUrl: "http://localhost:3000/membership/login",
    });
    createdMemberIds.push(member.id);

    const alumni = await promoteMemberToAlumni({
      memberId: member.id,
      graduationYear: 2024,
      inviteBaseUrl: "http://localhost:3000/alumni/reset-password",
    });
    createdAlumniIds.push(alumni.id);

    // The account exists but has no password yet — that's the whole point
    // of the invite flow — so logging in before setting one fails clearly.
    expect(alumni.email).toBe(member.email);
    expect(alumni.mustSetPassword).toBe(true);
    await expect(authenticateAlumni(member.email, "anything")).rejects.toBeInstanceOf(AlumniPasswordNotSetError);

    const tokenRecord = await db.alumniPasswordResetToken.findFirstOrThrow({
      where: { alumniId: alumni.id },
      orderBy: { createdAt: "desc" },
    });
    expect(tokenRecord.usedAt).toBeNull();

    const member2 = await db.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(member2.graduatedAt).not.toBeNull();

    // Promoting the same member twice must not be allowed.
    await expect(
      promoteMemberToAlumni({
        memberId: member.id,
        graduationYear: 2024,
        inviteBaseUrl: "http://localhost:3000/alumni/reset-password",
      }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    if (createdAlumniIds.length) {
      await db.alumniPasswordResetToken.deleteMany({ where: { alumniId: { in: createdAlumniIds } } });
      await db.alumniProfile.deleteMany({ where: { id: { in: createdAlumniIds } } });
    }
    if (createdMemberIds.length) {
      await db.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    if (createdApplicationIds.length) {
      await db.membershipApplication.deleteMany({ where: { id: { in: createdApplicationIds } } });
    }
    await db.auditLog.deleteMany({ where: { adminId: testAdminId } });
    await db.adminUser.deleteMany({ where: { email: "vitest-admin@example.com" } });
    await db.$disconnect();
  });
});
