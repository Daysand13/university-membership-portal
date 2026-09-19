import "server-only";
import { db } from "@/lib/db";
import { FILL_TIME_FIELD_NAME, type BotSignal } from "@/lib/bot-protection";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Records a public-form submission the bot check flagged.
 *
 * A flagged submission is answered as if it succeeded, so a script learns
 * nothing — which also means a real person caught by mistake is told their
 * form went through when it didn't. That's exactly how applicants came to
 * see "Application Submitted" with nothing saved and nothing logged. Every
 * flag now leaves an entry at Admin > Audit Log (PUBLIC_FORM_FLAGGED_AS_BOT)
 * with enough to find and contact the person if it was a mistake, and
 * whether it was let through anyway.
 *
 * Best-effort: logging must never change what happens to the submission.
 */
export async function logFlaggedSubmission(params: {
  form:
    | "enrollment"
    | "contact"
    | "alumni-registration"
    | "patron-registration"
    | "ally-signup"
    | "public-donation"
    | "software-request";
  signal: BotSignal;
  /** True when other evidence showed a real person, so it was accepted. */
  allowedThrough: boolean;
  formData: FormData;
}): Promise<void> {
  const { form, signal, allowedThrough, formData } = params;
  const pick = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
  };

  const details = {
    signal,
    allowedThrough,
    fillMs: pick(FILL_TIME_FIELD_NAME),
    name:
      [pick("firstName"), pick("lastName")].filter(Boolean).join(" ") || pick("name") || pick("fullName") || pick("donorName"),
    email: pick("email") ?? pick("donorEmail"),
    indexNumber: pick("indexNumber"),
    phone: pick("phone"),
  };
  console.warn("[bot-check] flagged", JSON.stringify({ form, signal, allowedThrough }));

  try {
    await db.auditLog.create({
      data: {
        action: "PUBLIC_FORM_FLAGGED_AS_BOT",
        entityType: "PublicForm",
        entityId: form,
        newValue: details as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[bot-check] could not record the flagged submission", err);
  }
}
