import { z } from "zod";
import { Gender } from "@/generated/prisma/enums";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

export const DISABILITY_CATEGORIES = [
  "Visual Impairment",
  "Low Vision",
  "Hearing Impairment",
  "Deaf",
  "Physical / Mobility Impairment",
  "Speech and Language Impairment",
  "Intellectual Disability",
  "Specific Learning Difficulty",
  "Autism Spectrum Disorder",
  "Albinism",
  "Chronic Illness",
  "Multiple Disabilities",
  "Other",
] as const;

export const CAMPUSES = ["Winneba Campus", "Ejumako Campus"] as const;

export const enrollmentSchema = z.object({
  // Personal
  firstName: z.string().trim().min(1, "First name is required").max(100),
  middleName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  dateOfBirth: z.coerce.date({ message: "Enter a valid date of birth" }),
  gender: z.enum(Gender),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  profileImageKey: z.string().optional(),
  medicalReportKey: z.string().min(1, "Medical report is required"),

  // Academic
  indexNumber: z.string().trim().min(3, "Index number is required").max(50),
  programme: z.string().trim().min(1, "Programme is required").max(150),
  department: z.enum(DISABILITY_CATEGORIES, {
    message: "Select a category of special needs",
  }),
  level: z.string().trim().min(1, "Level is required").max(20),
  campus: z.enum(CAMPUSES, { message: "Select a campus" }),
  yearOfAdmission: z.coerce
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  expectedGraduationYear: z.coerce.number().int().min(2000).max(2100).optional(),

  // Contact
  residentialAddress: z.string().trim().min(1, "Residential address is required").max(300),
  region: z.string().trim().min(1, "Region is required").max(100),
  emergencyContactName: z.string().trim().min(1, "Emergency contact name is required").max(150),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),

  // Membership
  membershipType: z.string().trim().max(100).optional().or(z.literal("")),

  // Verification
  agreedToTerms: z.literal(true, {
    message: "You must accept the terms to continue",
  }),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export const memberLoginSchema = z.object({
  indexNumber: z.string().trim().min(1, "Index number is required"),
  password: z.string().trim().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const applicationReviewSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "UNDER_REVIEW", "SUSPEND", "REQUEST_CHANGES"]),
  adminNote: z.string().max(1000).optional().or(z.literal("")),
});
