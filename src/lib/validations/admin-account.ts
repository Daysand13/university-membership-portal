import { z } from "zod";
import { AdminRole } from "@/generated/prisma/enums";
import { isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/auth/password";

/** What a super administrator fills in to create a colleague's account. */
export const adminAccountSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(Object.values(AdminRole) as [string, ...string[]], { message: "Choose a base role" }),
});

/** What the invited administrator fills in, at the other end of the link. */
export const adminSetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    newPassword: z.string().trim().refine(isPasswordStrongEnough, PASSWORD_REQUIREMENTS_MESSAGE),
    confirmNewPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
