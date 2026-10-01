/**
 * The arithmetic of making a phone photo small enough to send.
 *
 * Pure, with no React Native import, so tests/shrink.test.ts can check it.
 *
 * A photo straight off a modern phone camera is 3–8MB and 4000 pixels
 * across. The passport photo may be 2MB, a medical report 5MB, and every
 * megabyte is somebody's data allowance on a Ghanaian network. So images are
 * scaled down and re-encoded before they leave the phone — exactly what the
 * website does in the browser before uploading.
 */

/** Never enlarge: a small photo is sent at the size it is. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest === 0) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Each try a little harder, then stop: past 0.4 a face stops looking like a face. */
export const COMPRESS_STEPS = [0.8, 0.65, 0.5, 0.4] as const;

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/** What a file is, from its name, when the picker did not say. */
export function mimeFromName(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const types: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    heif: "image/heif",
    webp: "image/webp",
  };
  return types[ext] ?? null;
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
