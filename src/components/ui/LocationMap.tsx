import { ExternalLink, Navigation } from "lucide-react";
import type { MapLocation } from "@/lib/maps-url";

/**
 * A small embedded Google Map of the association's location, with plain
 * links underneath to open it in Google Maps or get directions — the links
 * are what a screen-reader user or someone on a phone will actually use, so
 * they're always shown rather than left to the map's own tiny controls.
 */
export function LocationMap({
  location,
  placeName,
  className = "",
}: {
  location: MapLocation;
  /** Used in the iframe's accessible title, e.g. the office address. */
  placeName?: string | null;
  className?: string;
}) {
  const title = placeName ? `Map showing the location of ${placeName}` : "Map showing our location";
  const hasLinks = Boolean(location.openUrl || location.directionsUrl);

  return (
    <figure className={`rounded-lg overflow-hidden border border-line bg-surface-muted ${className}`}>
      <div className="relative w-full aspect-[4/3] sm:aspect-video">
        <iframe
          src={location.embedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      {hasLinks && (
        <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 border-t border-line bg-white text-sm">
          {location.openUrl && (
            <a
              href={location.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 rounded-sm"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Open in Google Maps
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {location.directionsUrl && (
            <a
              href={location.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 rounded-sm"
            >
              <Navigation size={14} aria-hidden="true" />
              Get directions
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </figcaption>
      )}
    </figure>
  );
}
