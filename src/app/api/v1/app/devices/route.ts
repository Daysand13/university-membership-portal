import { type NextRequest } from "next/server";
import { z } from "zod";
import { actorId, appError, appJson, requireAppActor } from "@/lib/api/app-request";
import { listDevicesFor, registerPushToken } from "@/lib/services/mobile-device-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where to send this phone's notifications, and what it wants.
 *
 * Called once after the person has been asked for permission and said yes,
 * and again whenever Firebase rotates the token — which it does on its own
 * schedule, so the app must not assume the first one lasts.
 *
 * `pushToken: null` is how the app says "stop sending to this phone", which
 * is not the same as signing out.
 */
const schema = z.object({
  pushToken: z.string().trim().min(10).max(500).nullable(),
  preferences: z
    .object({
      news: z.boolean().optional(),
      events: z.boolean().optional(),
      announcements: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appError("That request wasn't readable.", 400);

  await registerPushToken({
    deviceId: auth.actor.deviceId,
    pushToken: parsed.data.pushToken,
    preferences: parsed.data.preferences,
  });

  return appJson({ registered: true });
}

/** The phones somebody is signed in on, so they can see them. */
export async function GET(request: NextRequest) {
  const auth = await requireAppActor(request);
  if ("response" in auth) return auth.response;

  const devices = await listDevicesFor(auth.actor.audience, actorId(auth.actor));
  return appJson({
    devices: devices.map((device) => ({
      id: device.id,
      name: device.deviceName,
      appVersion: device.appVersion,
      lastSeenAt: device.lastSeenAt.toISOString(),
      signedInAt: device.createdAt.toISOString(),
      isThisPhone: device.id === auth.actor.deviceId,
    })),
  });
}
