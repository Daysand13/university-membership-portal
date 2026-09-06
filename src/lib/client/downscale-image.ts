"use client";

/**
 * Client-side image shrinking for the public enrollment form.
 *
 * A photo taken on a modern phone is routinely 4–12MB straight out of the
 * camera, which is far more resolution than a passport picture or a snapshot
 * of a medical report needs — and large enough on its own to blow past the
 * request-body cap the form has to stay under (see MAX_TOTAL_UPLOAD_BYTES).
 * Re-encoding in the browser turns "your files are too large, go find a
 * compression tool" into something that just works on a phone.
 *
 * Every failure path deliberately returns the ORIGINAL file rather than
 * throwing. This runs on whatever browser a student happens to have, against
 * formats the browser may not be able to decode at all (HEIC is the common
 * one on newer phones). If re-encoding doesn't work, the caller's size guard
 * still catches an oversized file and shows a clear message — which is a much
 * better failure than a form that refuses to accept a valid photo.
 */

/** Longest edge, in pixels, of the re-encoded image. */
const DEFAULT_MAX_DIMENSION = 1600;

/** Quality steps tried in order before falling back to shrinking dimensions. */
const QUALITY_STEPS = [0.82, 0.7, 0.6] as const;

/** Give up rather than degrade an image into uselessness. */
const MIN_DIMENSION = 640;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap is the cheap path and handles EXIF orientation in
  // current browsers. Older Safari needs the <img> fallback.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path below.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function replaceExtension(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "");
  return `${base || "upload"}.jpg`;
}

export interface DownscaleOptions {
  /** Shrink until the result is at most this many bytes. */
  targetBytes: number;
  /** Longest edge of the output image. Defaults to 1600px. */
  maxDimension?: number;
}

/**
 * Returns a re-encoded JPEG no larger than `targetBytes` where possible.
 *
 * Returns the input file unchanged when it is not an image, is already small
 * enough, or cannot be decoded/re-encoded by this browser.
 */
export async function downscaleImage(file: File, options: DownscaleOptions): Promise<File> {
  const { targetBytes, maxDimension = DEFAULT_MAX_DIMENSION } = options;

  if (!file.type.startsWith("image/")) return file;
  if (file.size <= targetBytes) return file;

  try {
    const source = await loadBitmap(file);
    const sourceWidth = "width" in source ? source.width : 0;
    const sourceHeight = "height" in source ? source.height : 0;
    if (!sourceWidth || !sourceHeight) return file;

    let bound = Math.min(maxDimension, Math.max(sourceWidth, sourceHeight));
    let best: File | null = null;

    // Try progressively harder: first drop JPEG quality at the current size,
    // then halve the dimensions and start over. Stops as soon as something
    // fits, so a mild overshoot costs one pass rather than a full sweep.
    while (bound >= MIN_DIMENSION) {
      const scale = bound / Math.max(sourceWidth, sourceHeight);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        const candidate = new File([blob], replaceExtension(file.name), {
          type: "image/jpeg",
          lastModified: file.lastModified,
        });
        // Keep the smallest result seen, so that even a total failure to hit
        // the target still hands back the best available attempt.
        if (!best || candidate.size < best.size) best = candidate;
        if (candidate.size <= targetBytes) {
          if ("close" in source) source.close();
          return candidate;
        }
      }

      bound = Math.round(bound / 2);
    }

    if ("close" in source) source.close();

    // Nothing hit the target. Hand back whichever attempt was smallest, but
    // never something larger than what we started with.
    if (best && best.size < file.size) return best;
    return file;
  } catch {
    return file;
  }
}
