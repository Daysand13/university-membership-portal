import { type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appJson } from "@/lib/api/app-request";
import { refreshAppSession } from "@/lib/services/mobile-device-service";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A new pair of tokens, fifteen minutes at a time.
 *
 * The old refresh token stops working here, so a phone always holds exactly
 * one. If a spent one turns up again it has been copied, and the service
 * cuts off every session in that family rather than quietly issuing more.
 */
const schema = z.object({
  refreshToken: z.string().trim().min(20),
  device: z
    .object({
      deviceName: z.string().trim().max(120).optional(),
      appVersion: z.string().trim().max(40).optional(),
      androidSdk: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appError("Please sign in again.", 400, "sign_in_again");

  const ip = clientIpFrom(request.headers);
  const limit = await checkRateLimit(`app-refresh:ip:${ip}`, { max: 120, windowSeconds: 600 });
  if (!limit.allowed) return appError("Too many requests. Please try again shortly.", 429, "rate_limited");

  try {
    const outcome = await refreshAppSession(parsed.data);
    if (!outcome.ok) return appError(outcome.error, 401, "sign_in_again");

    return appJson({
      accessToken: outcome.session.accessToken,
      refreshToken: outcome.session.refreshToken,
      expiresInSeconds: outcome.session.expiresInSeconds,
      deviceId: outcome.session.deviceId,
    });
  } catch (err) {
    console.error("[app-refresh]", err);
    return appError("We couldn't refresh your session. Please sign in again.", 500, "sign_in_again");
  }
}
