import { describe, it, expect } from "vitest";
import { enrollmentSchema, changePasswordSchema } from "@/lib/validations/membership";
import { slugify, eventSchema } from "@/lib/validations/content";

const validEnrollment = {
  membershipType: "REGULAR",
  firstName: "Kojo",
  lastName: "Mensah",
  dateOfBirth: "2001-05-14",
  gender: "MALE",
  phone: "0244000000",
  email: "kojo@example.com",
  indexNumber: "UEW/EDU/24/0001",
  programme: "Bachelor of Education (B.Ed.) Basic Education (Early Grade / Primary / JHS Options)",
  department: "Visual Impairment",
  academicDepartment: "Department of Basic Education",
  level: "Level 200",
  campus: "Winneba Campus (Main Campus)",
  medicalReportKey: "test-medical-report-key",
  yearOfAdmission: "2024",
  residentialAddress: "123 Sample Street, Accra",
  region: "Greater Accra",
  emergencyContactName: "Ama Mensah",
  emergencyContactPhone: "0244111111",
  agreedToTerms: true,
};

describe("enrollmentSchema", () => {
  it("accepts a fully valid application", () => {
    const result = enrollmentSchema.safeParse(validEnrollment);
    expect(result.success).toBe(true);
  });

  it("rejects an application missing required fields", () => {
    const rest = { ...validEnrollment };
    delete (rest as Partial<typeof validEnrollment>).firstName;
    const result = enrollmentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = enrollmentSchema.safeParse({ ...validEnrollment, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("requires terms to be explicitly accepted", () => {
    const result = enrollmentSchema.safeParse({ ...validEnrollment, agreedToTerms: false });
    expect(result.success).toBe(false);
  });

  it("rejects an implausible year of admission", () => {
    const result = enrollmentSchema.safeParse({ ...validEnrollment, yearOfAdmission: "1950" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("rejects mismatched new/confirm passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "NewPassw0rd",
      confirmNewPassword: "Different1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a weak new password even if confirmed correctly", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "weak",
      confirmNewPassword: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a strong, matching password pair", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "NewPassw0rd",
      confirmNewPassword: "NewPassw0rd",
    });
    expect(result.success).toBe(true);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates titles", () => {
    expect(slugify("Orientation Week Highlights!")).toBe("orientation-week-highlights");
  });

  it("collapses repeated separators", () => {
    expect(slugify("A  --  B")).toBe("a-b");
  });
});

describe("eventSchema", () => {
  const base = {
    title: "Sample Event",
    description: "A description long enough to pass validation.",
    startDate: "2026-01-10",
    endDate: "2026-01-12",
    venue: "Main Hall",
  };

  it("accepts an event where end date is after start date", () => {
    expect(eventSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an event ending before it starts", () => {
    const result = eventSchema.safeParse({ ...base, startDate: "2026-01-12", endDate: "2026-01-10" });
    expect(result.success).toBe(false);
  });
});
