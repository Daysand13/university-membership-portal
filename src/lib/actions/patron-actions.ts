"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";
import { requireAdminRole } from "@/lib/auth/admin";
import { createPatronSession, destroyPatronSession, requirePatron } from "@/lib/auth/patron";
import { AdminRole } from "@/generated/prisma/client";
import { detectBot } from "@/lib/bot-protection";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { domainCanReceiveMail } from "@/lib/email-domain-check";
import { logFlaggedSubmission } from "@/lib/services/flagged-submission-service";
import {
  patronChangePasswordSchema,
  patronLoginSchema,
  patronProfileUpdateSchema,
  patronRegisterSchema,
  patronReviewSchema,
} from "@/lib/validations/patron";
import {
  authenticatePatron,
  changePatronPassword,
  DuplicatePatronEmailError,
  IncorrectPatronPasswordError,
  InvalidPatronCredentialsError,
  PatronNotApprovedError,
  PatronReviewError,
  registerPatron,
  reviewPatron,
  updatePatronProfile,
} from "@/lib/services/patron-service";
import type { ActionState } from "./types";

async function patronRegisterActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Looks automated: answered as if it worked, nothing saved, and recorded.
  const botSignal = detectBot(formData);
  if (botSignal) {
    await logFlaggedSubmission({ form: "patron-registration", signal: botSignal, allowedThrough: false, formData });
    return { success: true };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`patron-register:ip:${ip}`, { max: 10, windowSeconds: 3600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const entries = Object.fromEntries(formData);
  const parsed = patronRegisterSchema.safeParse({ ...entries, consent: entries.consent === "on" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (!(await domainCanReceiveMail(parsed.data.email))) {
    return {
      fieldErrors: {
        email: ["We couldn't find a mail server for this email address — please check it for a typo and try again."],
      },
    };
  }

  try {
    await registerPatron(parsed.data);
  } catch (err) {
    if (err instanceof DuplicatePatronEmailError) return { fieldErrors: { email: [err.message] } };
    throw err;
  }
  return { success: true };
}

async function patronLoginActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const entries = Object.fromEntries(formData);
  const parsed = patronLoginSchema.safeParse({ ...entries, rememberMe: entries.rememberMe === "on" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`patron-login:ip:${ip}`, { max: 20, windowSeconds: 600 }),
    checkRateLimit(`patron-login:email:${parsed.data.email}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) return { error: RATE_LIMIT_MESSAGE };

  let patron;
  try {
    patron = await authenticatePatron(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (err instanceof InvalidPatronCredentialsError || err instanceof PatronNotApprovedError) {
      return { error: err.message };
    }
    throw err;
  }

  await createPatronSession(patron, parsed.data.rememberMe);
  redirect("/patrons/dashboard");
}

async function patronLogoutActionImpl(): Promise<void> {
  await destroyPatronSession();
  redirect("/patrons/login");
}

async function updatePatronProfileActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = patronProfileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await updatePatronProfile(patron.id, parsed.data);
  revalidatePath("/patrons/dashboard", "layout");
  return { success: true };
}

async function changePatronPasswordActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const patron = await requirePatron();
  const parsed = patronChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await changePatronPassword(patron.id, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (err) {
    if (err instanceof IncorrectPatronPasswordError) return { fieldErrors: { currentPassword: [err.message] } };
    throw err;
  }
  return { success: true };
}

async function reviewPatronActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const parsed = patronReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "That request was incomplete. Please reload the page and try again." };

  try {
    await reviewPatron({ ...parsed.data, adminId: admin.id });
  } catch (err) {
    if (err instanceof PatronReviewError) return { error: err.message };
    throw err;
  }

  revalidatePath("/admin/patrons");
  revalidatePath(`/admin/patrons/${parsed.data.patronId}`);
  return { success: true };
}

export const patronRegisterAction = withActionErrorHandling("patronRegisterAction", patronRegisterActionImpl);
export const patronLoginAction = withActionErrorHandling("patronLoginAction", patronLoginActionImpl);
export const patronLogoutAction = withVoidActionErrorHandling("patronLogoutAction", patronLogoutActionImpl);
export const updatePatronProfileAction = withActionErrorHandling("updatePatronProfileAction", updatePatronProfileActionImpl);
export const changePatronPasswordAction = withActionErrorHandling(
  "changePatronPasswordAction",
  changePatronPasswordActionImpl,
);
export const reviewPatronAction = withActionErrorHandling("reviewPatronAction", reviewPatronActionImpl);
