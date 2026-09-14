"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import { contactMessageSchema } from "@/lib/validations/content";
import { submitContactMessage, markMessageRead, archiveMessage } from "@/lib/services/contact-service";
import { detectBot } from "@/lib/bot-protection";
import { logFlaggedSubmission } from "@/lib/services/flagged-submission-service";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import type { ActionState } from "./types";

async function submitContactMessageActionImpl(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Silently pretend success for anything that looks automated — no error,
  // no hint to a script that it was caught, and nothing gets saved. The flag
  // is recorded, so a real person caught by mistake can be found.
  const botSignal = detectBot(formData);
  if (botSignal) {
    await logFlaggedSubmission({ form: "contact", signal: botSignal, allowedThrough: false, formData });
    return { success: true };
  }

  const ip = await getClientIp();
  const limit = await checkRateLimit(`contact:ip:${ip}`, { max: 5, windowSeconds: 600 });
  if (!limit.allowed) return { error: RATE_LIMIT_MESSAGE };

  const parsed = contactMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await submitContactMessage(parsed.data);
  } catch (err) {
    console.error("[submit-contact-message]", err);
    return { error: "Something went wrong sending your message. Please try again." };
  }
  return { success: true };
}

async function markMessageReadActionImpl(id: string): Promise<void> {
  await requireAdminUser();
  await markMessageRead(id);
  revalidatePath("/admin/contact-messages");
}

async function archiveMessageActionImpl(id: string): Promise<void> {
  await requireAdminUser();
  await archiveMessage(id);
  revalidatePath("/admin/contact-messages");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const submitContactMessageAction = withActionErrorHandling("submitContactMessageAction", submitContactMessageActionImpl);
export const markMessageReadAction = withVoidActionErrorHandling("markMessageReadAction", markMessageReadActionImpl);
export const archiveMessageAction = withVoidActionErrorHandling("archiveMessageAction", archiveMessageActionImpl);
