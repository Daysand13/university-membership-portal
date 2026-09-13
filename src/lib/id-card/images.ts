import sharp from "sharp";

/**
 * Prepares the pictures that go on an ID card.
 *
 * Every image is fetched here and re-encoded with sharp before it reaches the
 * card renderer, for three reasons: the renderer can't decode every format a
 * photo might have been uploaded in (WebP among them); phone photos carry an
 * orientation flag that has to be applied or the face prints sideways; and
 * cropping to the exact frame size here gives a clean, predictable crop
 * instead of whatever the renderer would do with an arbitrary image.
 *
 * Every function returns null rather than throwing. A logo that can't be
 * fetched should cost the card its logo, not the whole card.
 */

const FETCH_TIMEOUT_MS = 8000;

export async function fetchImageBytes(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) {
      console.error("[id-card] image fetch failed", response.status, url);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.error("[id-card] image could not be fetched", url, err);
    return null;
  }
}

/** A photo cropped to fill exactly width × height, as a JPEG data URI. */
export async function coverJpegDataUri(
  bytes: Buffer,
  width: number,
  height: number,
  position: "north" | "centre" = "centre",
): Promise<string | null> {
  try {
    const out = await sharp(bytes)
      .rotate() // applies the phone's orientation flag
      .resize(width, height, { fit: "cover", position })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (err) {
    console.error("[id-card] image could not be processed", err);
    return null;
  }
}

/**
 * A logo for one of the round frames in the card header: trimmed of any flat
 * margin, centred on a white disc, and cut to a true circle with transparent
 * corners.
 *
 * Done here rather than by rounding the image on the card, because the card
 * renderer doesn't clip images to rounded corners — a logo on a white square
 * (the association's is a JPEG) showed its corners poking out past the frame.
 * `fill` leaves a margin inside the circle so a logo that isn't round itself
 * doesn't lose its corners to the cut.
 */
export async function discLogoDataUri(bytes: Buffer, size: number, fill = 0.9): Promise<string | null> {
  try {
    const oriented = await sharp(bytes).rotate().toBuffer();
    let trimmed = oriented;
    try {
      trimmed = await sharp(oriented).trim({ threshold: 12 }).toBuffer();
    } catch {
      // Nothing to trim (or an image trim can't read) — use it as it is.
    }

    const inner = Math.round(size * fill);
    const logo = await sharp(trimmed)
      .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    const circle = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
    );

    const out = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([
        { input: logo, gravity: "centre" },
        { input: circle, blend: "dest-in" },
      ])
      .png()
      .toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch (err) {
    console.error("[id-card] logo could not be processed", err);
    return null;
  }
}

/** A logo fitted inside a size × size square, transparency kept, as a PNG data URI. */
export async function containedPngDataUri(bytes: Buffer, size: number): Promise<string | null> {
  try {
    const out = await sharp(bytes)
      .rotate()
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch (err) {
    console.error("[id-card] logo could not be processed", err);
    return null;
  }
}
