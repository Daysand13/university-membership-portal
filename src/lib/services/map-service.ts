import "server-only";
import { unstable_cache } from "next/cache";
import { extractMapUrl, isMapShortLink, locationFromGoogleMapsUrl, type MapLocation } from "@/lib/maps-url";

export type { MapLocation };

/** Thrown when a short link couldn't be followed at all — as opposed to a
 *  link that was followed and simply isn't a map. Kept distinct so a brief
 *  network problem never gets cached, or reported to an admin, as "that
 *  isn't a valid map link". */
export class MapLinkUnreachableError extends Error {}

const MAX_REDIRECTS = 5;

async function followShortLink(start: string): Promise<string> {
  let current = start;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!isMapShortLink(current)) return current;
    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MembershipPortal/1.0)" },
      });
    } catch (err) {
      throw new MapLinkUnreachableError(err instanceof Error ? err.message : String(err));
    }
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

/**
 * Works out where a saved map link points. Returns null when the link isn't
 * a Google Maps location; throws MapLinkUnreachableError when a short link
 * couldn't be followed right now.
 */
export async function resolveMapLocation(raw: string): Promise<MapLocation | null> {
  const url = extractMapUrl(raw);
  if (!url) return null;
  const full = isMapShortLink(url) ? await followShortLink(url) : url;
  return locationFromGoogleMapsUrl(full);
}

/**
 * Cached for a week per distinct link. A short link only changes where it
 * points if someone saves a different link, and a different link is a
 * different cache key — so this is effectively one redirect lookup per
 * saved value, not one per page view.
 *
 * A failure throws inside the cached function, which unstable_cache doesn't
 * store, so a momentary network problem is retried on the next render
 * instead of hiding the map for a week.
 */
const cachedResolve = unstable_cache(
  async (raw: string) => resolveMapLocation(raw),
  ["map-location-v1"],
  { revalidate: 60 * 60 * 24 * 7 },
);

/** For rendering: never throws — a map that can't be worked out is simply
 *  not shown, rather than breaking the page around it. */
export async function getMapLocation(raw: string | null | undefined): Promise<MapLocation | null> {
  if (!raw?.trim()) return null;
  try {
    return await cachedResolve(raw.trim());
  } catch (err) {
    console.error("[map] could not resolve the saved map link", err);
    return null;
  }
}
