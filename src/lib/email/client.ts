import "server-only";
import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Sends transactional email via Resend. If RESEND_API_KEY isn't configured
 * (fresh clone, local dev, this sandbox), the email is logged to the server
 * console instead of being sent, so every flow that depends on email is
 * still fully exercisable without a provider account. Swap RESEND_API_KEY
 * in per the .env.example to send for real — no code changes needed.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ delivered: boolean }> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM || "no-reply@example.edu.gh";

  if (!client) {
    console.log(
      `\n[email:dev-fallback] RESEND_API_KEY not set — email logged instead of sent.\n` +
        `  To:      ${params.to}\n  From:    ${from}\n  Subject: ${params.subject}\n` +
        `  (HTML body omitted from console; ${params.html.length} chars)\n`,
    );
    return { delivered: false };
  }

  try {
    await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { delivered: true };
  } catch (error) {
    // Email failures must never crash the workflow that triggered them
    // (e.g. an approval should still succeed even if the email bounces at
    // the provider level) — log and let the caller decide whether to
    // surface a warning.
    console.error("[email] Resend send failed:", error);
    return { delivered: false };
  }
}
