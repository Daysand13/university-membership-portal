export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};

// A short allow-list of extensions we trust even if a browser reports a
// generic/incorrect MIME type. We never trust the browser MIME type alone —
// callers should also sniff magic bytes server-side where the stakes are
// high (see isLikelyValidImage below for the profile-picture upload path).
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
]);

export function isAllowedImageType(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function isAllowedDocumentType(mimeType: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType);
}

export function getExtensionFromFilename(filename: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedExtension(filename: string): boolean {
  const ext = getExtensionFromFilename(filename);
  return ALLOWED_EXTENSIONS.has(ext);
}

export function extensionForMimeType(mimeType: string, fallbackFilename?: string): string {
  return (
    EXTENSION_BY_MIME[mimeType] ??
    (fallbackFilename ? getExtensionFromFilename(fallbackFilename) : "") ??
    "bin"
  );
}

/** Strips path separators and anything that isn't a safe filename character. */
export function sanitizeFilenameStem(name: string): string {
  const stem = name.replace(/\.[^./]+$/, "");
  return (
    stem
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "file"
  );
}

/**
 * A minimal magic-byte sniff for the small set of image formats we accept.
 * This is defense in depth for endpoints (like public enrollment) that
 * accept files from unauthenticated visitors — never trust the client-sent
 * Content-Type alone for those paths.
 */
export function sniffImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

export function validateUploadRequest(params: {
  filename: string;
  mimeType: string;
  fileSize: number;
  category: "image" | "document";
  maxSizeBytes?: number;
}): { ok: true } | { ok: false; error: string } {
  const { filename, mimeType, fileSize, category, maxSizeBytes } = params;

  if (!isAllowedExtension(filename)) {
    return { ok: false, error: "That file type isn't supported." };
  }

  if (category === "image") {
    if (!isAllowedImageType(mimeType)) {
      return { ok: false, error: "Please upload a JPG, PNG, WEBP, or GIF image." };
    }
    const limit = maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
    if (fileSize > limit) {
      return { ok: false, error: `Images must be ${Math.round(limit / (1024 * 1024))} MB or smaller.` };
    }
  } else {
    if (!isAllowedDocumentType(mimeType)) {
      return { ok: false, error: "That document type isn't supported." };
    }
    const limit = maxSizeBytes ?? MAX_DOCUMENT_SIZE_BYTES;
    if (fileSize > limit) {
      return { ok: false, error: `Documents must be ${Math.round(limit / (1024 * 1024))} MB or smaller.` };
    }
  }

  return { ok: true };
}
