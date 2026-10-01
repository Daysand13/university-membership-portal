import { type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appFieldErrors, appJson } from "@/lib/api/app-request";
import { signUpAlumnus } from "@/lib/services/registration-service";
import { startAppSession } from "@/lib/services/mobile-device-service";
import { LABELS } from "@/lib/services/app-auth-service";
import { checkRateLimit, clientIpFrom, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deviceSchema = z
  .object({
    deviceName: z.string().trim().max(120).optional(),
    appVersion: z.string().trim().max(40).optional(),
    androidSdk: z.number().int().min(1).max(100).optional(),
  })
  .optional();

/**
 * A graduate joining the alumni network, from the app.
 *
 * On the website this signs them straight in — an alumni account needs no
 * approval — so here it answers exactly as a sign-in does, with a pair of
 * tokens and the identity, and the app goes straight to their dashboard.
 * Making somebody who has just chosen a password type it in again at once
 * would be a small cruelty.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const limit = await checkRateLimit(`alumni-register:ip:${ip}`, { max: 10, windowSeconds: 3600 });
  if (!limit.allowed) return appError(RATE_LIMIT_MESSAGE, 429, "rate_limited");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return appError("That form wasn't readable. Please try again.", 400);
  }

  const { device, ...fields } = body;
  const outcome = await signUpAlumnus(fields);
  if (!outcome.ok) {
    if (outcome.fieldErrors && Object.keys(outcome.fieldErrors).length > 0) {
      return appFieldErrors(outcome.fieldErrors, outcome.error);
    }
    return appError(outcome.error ?? "Something went wrong. Please try again.", 500);
  }

  const alumni = outcome.value;
  const describedDevice = deviceSchema.safeParse(device);
  const session = await startAppSession({
    audience: "ALUMNI",
    subjectId: alumni.id,
    device: describedDevice.success ? describedDevice.data : undefined,
  });

  return appJson({
    identity: { audience: "ALUMNI", label: LABELS.ALUMNI, id: alumni.id, name: alumni.fullName },
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresInSeconds: session.expiresInSeconds,
    deviceId: session.deviceId,
  });
}
