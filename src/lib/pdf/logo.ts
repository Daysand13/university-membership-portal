import "server-only";

/**
 * Loads the site logo as a data URI for embedding in an exported PDF.
 *
 * Fetched here and handed to the document as bytes rather than letting
 * @react-pdf/renderer fetch the URL itself, so a storage hiccup can never
 * take down an export: every failure path returns null and the document
 * renders its letterhead without the mark. An admin would much rather have
 * a logo-less member list than a 500.
 *
 * Only JPEG and PNG are accepted because those are the formats
 * @react-pdf/renderer can actually decode — handing it a WebP or an SVG
 * throws mid-render, which is exactly the failure this guards against.
 */
const LOGO_FETCH_TIMEOUT_MS = 4000;
const PDF_SAFE_IMAGE_TYPES = ["image/jpeg", "image/png"];

export async function loadLogoDataUri(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      console.error("[pdf-logo] logo fetch failed", response.status, logoUrl);
      return null;
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!PDF_SAFE_IMAGE_TYPES.includes(contentType)) {
      console.error("[pdf-logo] logo is not a PDF-embeddable format, skipping", contentType, logoUrl);
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch (err) {
    console.error("[pdf-logo] logo could not be loaded, rendering without it:", err);
    return null;
  }
}
