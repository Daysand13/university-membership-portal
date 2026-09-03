import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** A short machine-readable name for which template this is (e.g.
   * "application-approved"), stored in the audit log so admins can filter
   * by email type without parsing subject lines. */
  template: string;
  /** Optional link back to the record this email concerns (an application,
   * a member, etc.) so it shows up when auditing that specific entity. */
  entityType?: string;
  entityId?: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [500, 2000]; // backoff between attempt 1→2 and 2→3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Persists a record of the send attempt for auditing (visible at
 * /admin/email-logs). Deliberately best-effort: a failure here is logged to
 * the console but never thrown, so a broken audit write can't take down an
 * approval, rejection, or password reset that would otherwise succeed.
 */
async function logEmailAttempt(params: {
  to: string;
  subject: string;
  template: string;
  status: "SENT" | "FAILED" | "SKIPPED_NO_PROVIDER";
  attempts: number;
  errorMessage?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        to: params.to,
        subject: params.subject,
        template: params.template,
        status: params.status,
        attempts: params.attempts,
        errorMessage: params.errorMessage,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
  } catch (err) {
    console.error("[email] Failed to write audit log entry (email itself was unaffected):", err);
  }
}

/**
 * Sends transactional email via Resend, with automatic retries on
 * transient failures and an audit trail of every attempt.
 *
 * If RESEND_API_KEY isn't configured (fresh clone, local dev, this
 * sandbox), the email is logged to the server console instead of being
 * sent, so every flow that depends on email is still fully exercisable
 * without a provider account. Swap RESEND_API_KEY in per the .env.example
 * to send for real — no code changes needed.
 *
 * Email failures must never crash the workflow that triggered them (e.g.
 * an approval should still succeed even if the email bounces at the
 * provider level) — this function always resolves, never throws; callers
 * check `.delivered` if they want to warn the admin inline.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ delivered: boolean }> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM || "no-reply@example.edu.gh";
  const template = params.template;

  if (!client) {
    console.log(
      `\n[email:dev-fallback] RESEND_API_KEY not set — email logged instead of sent.\n` +
        `  To:      ${params.to}\n  From:    ${from}\n  Subject: ${params.subject}\n` +
        `  (HTML body omitted from console; ${params.html.length} chars)\n`,
    );
    await logEmailAttempt({
      to: params.to,
      subject: params.subject,
      template,
      status: "SKIPPED_NO_PROVIDER",
      attempts: 0,
      entityType: params.entityType,
      entityId: params.entityId,
    });
    return { delivered: false };
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await client.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      await logEmailAttempt({
        to: params.to,
        subject: params.subject,
        template,
        status: "SENT",
        attempts: attempt,
        entityType: params.entityType,
        entityId: params.entityId,
      });
      return { delivered: true };
    } catch (error) {
      lastError = error;
      console.error(`[email] Resend send failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, error);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS[attempt - 1]);
      }
    }
  }

  await logEmailAttempt({
    to: params.to,
    subject: params.subject,
    template,
    status: "FAILED",
    attempts: MAX_ATTEMPTS,
    errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
    entityType: params.entityType,
    entityId: params.entityId,
  });
  return { delivered: false };
}
