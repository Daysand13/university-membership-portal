import { type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appJson } from "@/lib/api/app-request";
import { signInFromApp } from "@/lib/services/app-auth-service";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signing in from the Android app.
 *
 * The same box as the website's unified sign-in: an index number or an
 * email address, and a password. Somebody who is both a student and a
 * graduate is asked which portal they want rather than being put wherever
 * we guessed — the app shows the choice and calls this again with it.
 *
 * Limits are per address and per identifier, matching the website's, so
 * the app is not a quieter door into the same building.
 */
/**
 * A field the app left out entirely reads as blank, not as a type error.
 * Without this, somebody tapping Sign in on an empty form is told
 * "Invalid input: expected string, received undefined", which is a message
 * for a programmer and no use at all to a member.
 */
const given = (message: string) =>
  z.preprocess((value) => (value == null ? "" : value), z.string().trim().min(1, message));

const schema = z.object({
  identifier: given("Enter your index number or email address."),
  password: given("Enter your password."),
  audience: z.enum(["MEMBER", "ALUMNI", "PATRON"], { message: "Choose which portal to sign in to." }).optional(),
  device: z
    .object({
      deviceName: z.string().trim().max(120).optional(),
      appVersion: z.string().trim().max(40).optional(),
      androidSdk: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return appError(parsed.error.issues[0]?.message ?? "That sign-in request wasn't readable.", 400);
  }

  const ip = clientIpFrom(request.headers);
  const [byIp, byIdentifier] = await Promise.all([
    checkRateLimit(`app-login:ip:${ip}`, { max: 40, windowSeconds: 600 }),
    checkRateLimit(`app-login:id:${parsed.data.identifier.toLowerCase()}`, { max: 8, windowSeconds: 600 }),
  ]);
  if (!byIp.allowed || !byIdentifier.allowed) {
    return appError("Too many attempts. Please wait a few minutes and try again.", 429, "rate_limited");
  }

  try {
    const outcome = await signInFromApp(parsed.data);
    if (!outcome.ok) return appError(outcome.error, 401, "invalid_credentials");

    if ("chooseFrom" in outcome) {
      return appJson({ chooseFrom: outcome.chooseFrom });
    }

    return appJson({
      identity: outcome.identity,
      accessToken: outcome.session.accessToken,
      refreshToken: outcome.session.refreshToken,
      expiresInSeconds: outcome.session.expiresInSeconds,
      deviceId: outcome.session.deviceId,
    });
  } catch (err) {
    console.error("[app-login]", err);
    return appError("We couldn't sign you in just now. Please try again.", 500);
  }
}
