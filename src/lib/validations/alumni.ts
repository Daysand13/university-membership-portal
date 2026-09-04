import { z } from "zod";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

const phoneRegex = /^[0-9+()\-\s]{7,20}$/;

export const alumniRegisterSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone / WhatsApp number"),
  graduationYear: z.coerce
    .number()
    .int()
    .min(1960)
    .max(new Date().getFullYear() + 1, "Enter a valid graduation year"),
  programme: z.string().trim().min(1, "Programme is required").max(200),
  profession: z.string().trim().max(150).optional().or(z.literal("")),
  currentLocation: z.string().trim().max(150).optional().or(z.literal("")),
  password: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
  consent: z.literal(true, {
    message: "You must agree to join the alumni network to continue",
  }),
});
export type AlumniRegisterInput = z.infer<typeof alumniRegisterSchema>;

export const alumniLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().trim().min(1, "Password is required"),
  rememberMe: z.coerce.boolean().optional().default(false),
});

export const alumniProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(150),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone / WhatsApp number"),
  profession: z.string().trim().max(150).optional().or(z.literal("")),
  currentLocation: z.string().trim().max(150).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  willingToMentor: z.coerce.boolean().optional().default(false),
  directoryVisible: z.coerce.boolean().optional().default(false),
});

export const alumniChangePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const alumniSetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export const alumniForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
