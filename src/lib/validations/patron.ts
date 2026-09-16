import { z } from "zod";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

/** Honorifics offered on the patron forms; used to greet patrons in emails. */
export const PATRON_TITLES = ["Prof.", "Dr.", "Rev.", "Hon.", "Mr.", "Mrs.", "Ms.", "Miss"] as const;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** The details a patron can keep up to date themselves. */
const patronDetailsShape = {
  title: z.enum(PATRON_TITLES).optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Enter your full name").max(200),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid telephone number"),
  occupation: z.string().trim().min(2, "Tell us what work you do").max(200),
  organization: optionalText(300),
  jobTitle: optionalText(200),
  address: optionalText(500),
  region: optionalText(100),
};

export const patronRegisterSchema = z
  .object({
    ...patronDetailsShape,
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
    supportInterest: optionalText(5000),
    motivation: optionalText(5000),
    password: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmPassword: z.string().trim(),
    consent: z.literal(true, {
      message: "Please confirm your details are accurate and that the association may contact you",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type PatronRegisterInput = z.infer<typeof patronRegisterSchema>;

export const patronLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().trim().min(1, "Password is required"),
  rememberMe: z.coerce.boolean().optional().default(false),
});

export const patronProfileUpdateSchema = z.object(patronDetailsShape);
export type PatronProfileUpdateInput = z.infer<typeof patronProfileUpdateSchema>;

export const patronChangePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const PATRON_DECISIONS = ["APPROVE", "REJECT", "SUSPEND"] as const;
export type PatronDecision = (typeof PATRON_DECISIONS)[number];

export const patronReviewSchema = z.object({
  patronId: z.string().min(1),
  decision: z.enum(PATRON_DECISIONS),
  note: optionalText(5000),
});
