/**
 * Turning whatever an administrator pastes into "Google Maps link" into
 * something a page can actually show.
 *
 * Only Google's dedicated embed URLs (/maps/embed?pb=…) may be put inside an
 * iframe. Every other kind of link — the maps.app.goo.gl share link Google
 * hands out by default, a /maps/place/… page, a /maps/dir/… directions link
 * — is refused by Google when framed, so the page shows a grey "refused to
 * connect" box. That is what the contact page was doing: the saved link was
 * a share link. Rather than make admins hunt for the one link format that
 * works, this reads the location out of any of them and builds the embed.
 *
 * Kept free of server-only imports so the settings form's validation can use
 * extractMapUrl too. Following a short link needs the network, so that part
 * lives in lib/services/map-service.ts.
 */

export interface MapLocation {
  /** Safe to use as an iframe src. */
  embedUrl: string;
  /** Opens the place in Google Maps (the app, on a phone). */
  openUrl: string | null;
  /** Directions to the place from wherever the visitor is. */
  directionsUrl: string | null;
}

/** Hosts that only ever redirect to a full Google Maps URL. */
export const MAP_SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

const COORDINATE = /^(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/;

/**
 * Pulls the URL out of what was pasted. Google's "Embed a map" option gives
 * a whole `<iframe …>` snippet rather than a URL, and it's the most natural
 * thing to paste into a field labelled for an embed — so accept it.
 */
export function extractMapUrl(raw: string): string {
  const value = raw.trim();
  if (!value.toLowerCase().includes("<iframe")) return value;
  const match = /src\s*=\s*["']([^"']+)["']/i.exec(value);
  return match ? match[1].replace(/&amp;/g, "&").trim() : value;
}

function isGoogleMapsUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const isGoogle = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
  if (!isGoogle) return false;
  return host.startsWith("maps.") || url.pathname.startsWith("/maps");
}

function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function fromCoordinates(lat: number, lng: number): MapLocation {
  const point = `${lat},${lng}`;
  return {
    embedUrl: `https://maps.google.com/maps?q=${point}&z=16&output=embed`,
    openUrl: `https://www.google.com/maps/search/?api=1&query=${point}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${point}`,
  };
}

function fromQuery(query: string): MapLocation {
  const q = encodeURIComponent(query);
  return {
    embedUrl: `https://maps.google.com/maps?q=${q}&z=16&output=embed`,
    openUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
  };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment.replace(/\+/g, " ")).trim();
  } catch {
    return segment.replace(/\+/g, " ").trim();
  }
}

/**
 * Reads a location out of a full Google Maps URL (not a short link — resolve
 * those first). Returns null when the URL isn't Google Maps or holds no
 * recognisable place.
 *
 * Where a URL carries more than one position, the place is preferred over
 * everything else, deliberately. A directions link shared from a phone
 * (/maps/dir/5.38,-0.65/University+of+Education/…) begins with the sharer's
 * own GPS position — typically an admin's home — and that must never end up
 * pinned on a public page. The destination's coordinates are the LAST
 * `!3d…!4d…` pair in the data blob, so that's the one used.
 */
export function locationFromGoogleMapsUrl(input: string): MapLocation | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!isGoogleMapsUrl(url)) return null;

  // Already an embed URL: usable as-is. Its pb blob stores the view centre
  // as !2d<lng>!3d<lat>, which is enough for the open/directions links.
  if (url.pathname.startsWith("/maps/embed")) {
    url.protocol = "https:";
    const pb = url.searchParams.get("pb") ?? "";
    const centre = /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/.exec(pb);
    const derived = centre && validCoordinates(Number(centre[2]), Number(centre[1]))
      ? fromCoordinates(Number(centre[2]), Number(centre[1]))
      : null;
    return {
      embedUrl: url.toString(),
      openUrl: derived?.openUrl ?? null,
      directionsUrl: derived?.directionsUrl ?? null,
    };
  }

  const href = decodeSegment(url.pathname) + " " + url.search;

  // 1. The place itself: the last !3d<lat>!4d<lng> pair.
  const placePairs = [...href.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)];
  const place = placePairs.at(-1);
  if (place && validCoordinates(Number(place[1]), Number(place[2]))) {
    return fromCoordinates(Number(place[1]), Number(place[2]));
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // 2. A named place or search: /maps/place/<name>/… or /maps/search/<query>/…
  const namedIndex = segments.findIndex((s) => s === "place" || s === "search");
  if (namedIndex !== -1 && segments[namedIndex + 1] && !segments[namedIndex + 1].startsWith("@")) {
    const name = decodeSegment(segments[namedIndex + 1]);
    const coords = COORDINATE.exec(name);
    if (coords && validCoordinates(Number(coords[1]), Number(coords[2]))) {
      return fromCoordinates(Number(coords[1]), Number(coords[2]));
    }
    if (name) return fromQuery(name);
  }

  // 3. Query parameters (maps.google.com/?q=…, /maps?q=…, api=1 links).
  for (const param of ["q", "query", "destination", "daddr", "ll"]) {
    const value = url.searchParams.get(param)?.trim();
    if (!value) continue;
    const coords = COORDINATE.exec(value);
    if (coords && validCoordinates(Number(coords[1]), Number(coords[2]))) {
      return fromCoordinates(Number(coords[1]), Number(coords[2]));
    }
    if (param !== "ll") return fromQuery(value);
  }

  // 4. A directions link with no data blob: the destination is the last
  //    stop in the path. The first stop is where the sharer was — skipped.
  const dirIndex = segments.indexOf("dir");
  if (dirIndex !== -1) {
    const stops = segments.slice(dirIndex + 1).filter((s) => !s.startsWith("@") && !s.startsWith("data="));
    const destination = stops.at(-1);
    if (destination && stops.length >= 1) {
      const name = decodeSegment(destination);
      const coords = COORDINATE.exec(name);
      if (coords && validCoordinates(Number(coords[1]), Number(coords[2]))) {
        return fromCoordinates(Number(coords[1]), Number(coords[2]));
      }
      if (name) return fromQuery(name);
    }
  }

  // 5. Only a viewport: /maps/@<lat>,<lng>,<zoom>z
  const viewport = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url.pathname);
  if (viewport && validCoordinates(Number(viewport[1]), Number(viewport[2]))) {
    return fromCoordinates(Number(viewport[1]), Number(viewport[2]));
  }

  return null;
}

export function isMapShortLink(input: string): boolean {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (host === "goo.gl") return url.pathname.startsWith("/maps");
    return MAP_SHORT_LINK_HOSTS.has(host);
  } catch {
    return false;
  }
}
