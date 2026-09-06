import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Best-effort client identifier for rate-limiting purposes. Vercel sets
 * x-forwarded-for on every request; this is not a substitute for real
 * authentication and can be spoofed by a determined attacker, but it's
 * enough to stop the overwhelming majority of casual abuse (repeated
 * login guesses, form-spam scripts) without requiring any account or
 * external service.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  /** Present only when `allowed` is false — how long until the limit resets. */
  retryAfterSeconds?: number;
}

/**
 * Checks and records an attempt against a rate limit, in one call. `key`
 * should already include whatever scope you want limited on — e.g.
 * `login:ip:1.2.3.4` and `login:email:someone@example.com` for two
 * different limits on the same login attempt. Every call both checks
 * whether the limit is currently exceeded AND records this attempt
 * (whether or not it was allowed) — so limits are enforced across
 * concurrent requests without a separate "consume" step.
 *
 * Uses the database rather than in-memory state, since Vercel runs many
 * separate serverless instances that don't share memory — this is what
 * makes the limit actually hold up across all of them.
 */
export async function checkRateLimit(
  key: string,
  params: { max: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - params.windowSeconds * 1000);

  const [count] = await Promise.all([
    db.rateLimitAttempt.count({ where: { key, createdAt: { gte: since } } }),
    db.rateLimitAttempt.create({ data: { key } }),
    // Opportunistic cleanup so this table never grows unbounded — cheap,
    // and only actually deletes anything roughly once in a while.
    Math.random() < 0.02
      ? db.rateLimitAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      : Promise.resolve(),
  ]);

  if (count >= params.max) {
    return { allowed: false, retryAfterSeconds: params.windowSeconds };
  }
  return { allowed: true };
}

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";
