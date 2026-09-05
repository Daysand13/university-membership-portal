import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  submitApplication,
  approveApplication,
  rejectApplication,
  authenticateMember,
  changeMemberPassword,
  deleteMember,
  deleteApplication,
  DuplicateIndexNumberError,
  InvalidCredentialsError,
} from "@/lib/services/membership-service";
import type { EnrollmentInput } from "@/lib/validations/membership";

// This suite exercises the real service layer against the real local
// Postgres database (via the same Prisma client the app uses) rather than
// mocking anything — it is the most direct proof that "submit -> admin
// approves -> account exists -> member can log in" genuinely works end to
// end, not just that each function compiles in isolation.

function buildApplication(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  const unique = randomUUID().slice(0, 8);
  return {
    track: "UNDERGRADUATE",
    firstName: "Test",
    lastName: "Applicant",
    dateOfBirth: new Date("2001-01-01"),
    gender: "MALE",
    phone: "0244000000",
    email: `test-${unique}@example.com`,
    indexNumber: `TEST/${unique}`,
    programme: "Special Education",
    department: "Visual Impairment",
    academicDepartment: "Special Education",
    specificSupportNeeds: [],
    medicalReportKey: "test-medical-report-key",
    level: "Level 200",
    campus: "Winneba Main Campus",
    yearOfAdmission: 2024,
    residentialAddress: "1 Test Street",
    region: "Greater Accra",
    emergencyContactName: "Emergency Contact",
    emergencyContactPhone: "0244111111",
    membershipType: "REGULAR",
    agreedToTerms: true,
    ...overrides,
  };
}

const createdApplicationIds: string[] = [];
const createdMemberIds: string[] = [];

let testAdminId: string;

describe("membership end-to-end flow", () => {
  it("sets up a throwaway admin for review actions", async () => {
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

  it("saves a new application as PENDING and makes it visible to admin queries", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    createdApplicationIds.push(application.id);

    expect(application.status).toBe("PENDING");

    const found = await db.membershipApplication.findUnique({ where: { id: application.id } });
    expect(found).not.toBeNull();
    expect(found?.indexNumber).toBe(input.indexNumber);
  });

  it("rejects a second application with the same index number", async () => {
    const input = buildApplication();
    const first = await submitApplication(input, null, null);
    createdApplicationIds.push(first.id);

    await expect(submitApplication(buildApplication({ indexNumber: input.indexNumber }), null, null)).rejects.toBeInstanceOf(
      DuplicateIndexNumberError,
    );
  });

  it("approving an application creates a member with the phone number as a securely hashed temporary password", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    createdApplicationIds.push(application.id);

    const member = await approveApplication({
      applicationId: application.id,
      adminId: testAdminId,
      loginUrl: "http://localhost:3000/membership/login",
    });
    createdMemberIds.push(member.id);

    expect(member.indexNumber).toBe(input.indexNumber);
    expect(member.mustChangePassword).toBe(true);
    expect(member.passwordHash).not.toBe(input.phone.replace(/[^0-9]/g, "")); // never stored in plaintext
    expect(member.passwordHash.startsWith("$2")).toBe(true);

    const updatedApplication = await db.membershipApplication.findUnique({ where: { id: application.id } });
    expect(updatedApplication?.status).toBe("APPROVED");

    const auditEntry = await db.auditLog.findFirst({
      where: { entityId: application.id, action: "APPROVE_APPLICATION" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("the approved member can log in with their phone number as password, and must change it", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    createdApplicationIds.push(application.id);
    const member = await approveApplication({
      applicationId: application.id,
      adminId: testAdminId,
      loginUrl: "http://localhost:3000/membership/login",
    });
    createdMemberIds.push(member.id);

    const authenticated = await authenticateMember(input.indexNumber, input.phone.replace(/[^0-9]/g, ""));
    expect(authenticated.id).toBe(member.id);
    expect(authenticated.mustChangePassword).toBe(true);

    await expect(authenticateMember(input.indexNumber, "wrong-password")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("a member can change their password, after which the old temporary password no longer works", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    createdApplicationIds.push(application.id);
    const member = await approveApplication({
      applicationId: application.id,
      adminId: testAdminId,
      loginUrl: "http://localhost:3000/membership/login",
    });
    createdMemberIds.push(member.id);
    const temporaryPassword = input.phone.replace(/[^0-9]/g, "");

    await changeMemberPassword({
      memberId: member.id,
      currentPassword: temporaryPassword,
      newPassword: "NewSecurePass1",
    });

    const authenticated = await authenticateMember(input.indexNumber, "NewSecurePass1");
    expect(authenticated.mustChangePassword).toBe(false);

    await expect(authenticateMember(input.indexNumber, temporaryPassword)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejecting an application leaves it terminal without creating a member", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    createdApplicationIds.push(application.id);

    const rejected = await rejectApplication({ applicationId: application.id, adminId: testAdminId, note: "Test rejection" });
    expect(rejected.status).toBe("REJECTED");

    const member = await db.member.findUnique({ where: { indexNumber: input.indexNumber } });
    expect(member).toBeNull();
  });

  it("deleting a member also removes their original application, freeing the index number to reapply", async () => {
    const input = buildApplication();
    const application = await submitApplication(input, null, null);
    const member = await approveApplication({
      applicationId: application.id,
      adminId: testAdminId,
      loginUrl: "http://localhost:3000/membership/login",
    });

    await deleteMember({ memberId: member.id, adminId: testAdminId });

    // Neither the member nor the original application should still exist —
    // this is what actually frees the indexNumber (and, indirectly, the
    // email) to be used again.
    expect(await db.member.findUnique({ where: { id: member.id } })).toBeNull();
    expect(await db.membershipApplication.findUnique({ where: { id: application.id } })).toBeNull();

    // The real regression test: re-submitting with the exact same index
    // number must succeed, not throw DuplicateIndexNumberError.
    const resubmitted = await submitApplication(buildApplication({ indexNumber: input.indexNumber }), null, null);
    createdApplicationIds.push(resubmitted.id);
    expect(resubmitted.indexNumber).toBe(input.indexNumber);
  });

  it("an admin can delete a rejected application, but not a pending one", async () => {
    const rejectedInput = buildApplication();
    const rejectedApp = await submitApplication(rejectedInput, null, null);
    await rejectApplication({ applicationId: rejectedApp.id, adminId: testAdminId, note: "Test rejection" });
    await deleteApplication({ applicationId: rejectedApp.id, adminId: testAdminId });
    expect(await db.membershipApplication.findUnique({ where: { id: rejectedApp.id } })).toBeNull();

    const pendingInput = buildApplication();
    const pendingApp = await submitApplication(pendingInput, null, null);
    createdApplicationIds.push(pendingApp.id);
    await expect(deleteApplication({ applicationId: pendingApp.id, adminId: testAdminId })).rejects.toThrow();
    expect(await db.membershipApplication.findUnique({ where: { id: pendingApp.id } })).not.toBeNull();
  });

  afterAll(async () => {
    // Clean up everything this suite created so repeated runs stay idempotent.
    if (createdMemberIds.length) {
      await db.passwordResetToken.deleteMany({ where: { memberId: { in: createdMemberIds } } });
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
