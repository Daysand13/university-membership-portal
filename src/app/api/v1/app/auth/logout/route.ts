import { type NextRequest } from "next/server";
import { appJson, requireAppActor } from "@/lib/api/app-request";
import { endAppSession } from "@/lib/services/mobile-device-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signing out this phone, and only this phone.
 *
 * Somebody with a phone and a tablet keeps the other one. Signing out also
 * takes the Firebase address with it, so a phone that has been handed on
 * stops receiving the association's notifications.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAppActor(request);
  // An expired or already-revoked session is a successful sign-out from the
  // person's point of view; there is nothing for them to do about it.
  if ("response" in auth) return appJson({ signedOut: true });

  await endAppSession(auth.actor.deviceId);
  return appJson({ signedOut: true });
}
