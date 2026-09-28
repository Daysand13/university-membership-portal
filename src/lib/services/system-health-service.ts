import "server-only";
import { db } from "@/lib/db";
import { isR2Configured } from "@/lib/storage/r2";
import { isPaystackConfigured } from "@/lib/services/paystack-client";
import { isPushConfigured } from "@/lib/push/fcm";

/**
 * Whether the services the association depends on are actually working —
 * the "System Health" light in the admin header.
 *
 * Deliberately checks what an executive could be caught out by, in words
 * they can act on: not "is the server up" (they're looking at it), but "are
 * emails going out", "can people pay online", "can people attach files".
 * Every check is cheap — a count or an environment variable — because the
 * header renders on every admin page.
 */

export type HealthState = "ok" | "warning" | "off";

export interface HealthCheck {
  key: string;
  label: string;
  state: HealthState;
  detail: string;
}

export interface SystemHealth {
  checks: HealthCheck[];
  /** How many checks need someone's attention. */
  problems: number;
}

/** A burst of failures, not one bounced address, is what counts as a problem. */
const EMAIL_FAILURE_THRESHOLD = 5;

export function summariseHealth(input: {
  databaseReachable: boolean;
  emailConfigured: boolean;
  recentEmailFailures: number;
  paymentsConfigured: boolean;
  storageConfigured: boolean;
  pushConfigured: boolean;
  /** Phones signed in and asking to be notified. */
  phonesReachable: number;
}): SystemHealth {
  const checks: HealthCheck[] = [
    {
      key: "database",
      label: "Database",
      state: input.databaseReachable ? "ok" : "warning",
      detail: input.databaseReachable ? "Connected." : "Couldn't be reached just now — pages may fail to load.",
    },
    {
      key: "email",
      label: "Email",
      state: !input.emailConfigured
        ? "off"
        : input.recentEmailFailures >= EMAIL_FAILURE_THRESHOLD
          ? "warning"
          : "ok",
      detail: !input.emailConfigured
        ? "No email provider is set up, so nothing is being sent."
        : input.recentEmailFailures >= EMAIL_FAILURE_THRESHOLD
          ? `${input.recentEmailFailures} emails failed in the last 24 hours — see Email Logs.`
          : input.recentEmailFailures > 0
            ? `Sending. ${input.recentEmailFailures} failed in the last 24 hours.`
            : "Sending normally.",
    },
    {
      key: "payments",
      label: "Online payments",
      state: input.paymentsConfigured ? "ok" : "off",
      detail: input.paymentsConfigured
        ? "Paystack is connected for dues and donations."
        : "Paystack isn't connected, so dues and donations can only be recorded by hand.",
    },
    {
      key: "storage",
      label: "File uploads",
      state: input.storageConfigured ? "ok" : "off",
      detail: input.storageConfigured
        ? "File storage is connected."
        : "File storage isn't connected, so photos, reports and documents can't be attached.",
    },
    {
      key: "push",
      label: "App notifications",
      // Configured but reaching nobody is not a fault: it is what the day
      // before the app is released looks like. Worth saying, not worth a
      // warning light.
      state: input.pushConfigured ? "ok" : "off",
      detail: !input.pushConfigured
        ? "Firebase isn't connected, so publishing news or an event won't reach anybody's phone."
        : input.phonesReachable === 0
          ? "Firebase is connected. No phones have asked for notifications yet."
          : `Firebase is connected. ${input.phonesReachable} phone${input.phonesReachable === 1 ? "" : "s"} will be notified.`,
    },
  ];
  return { checks, problems: checks.filter((c) => c.state !== "ok").length };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let databaseReachable = true;
  let recentEmailFailures = 0;
  let phonesReachable = 0;
  try {
    [recentEmailFailures, phonesReachable] = await Promise.all([
      db.emailLog.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
      db.mobileDevice.count({ where: { revokedAt: null, pushToken: { not: null } } }),
    ]);
  } catch (err) {
    console.error("[system-health] database check failed", err);
    databaseReachable = false;
  }

  return summariseHealth({
    databaseReachable,
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    recentEmailFailures,
    paymentsConfigured: isPaystackConfigured(),
    storageConfigured: isR2Configured(),
    pushConfigured: isPushConfigured(),
    phonesReachable,
  });
}
