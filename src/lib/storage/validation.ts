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

/**
 * Recordings. Here because a student reporting a barrier may find it far
 * easier to say what happened than to type it — a voice note is an
 * accessibility feature, not a nice-to-have.
 */
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
export const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

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
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "weba",
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
  "mp3",
  "m4a",
  "mp4",
  "wav",
  "ogg",
  "oga",
  "weba",
  "webm",
]);

export function isAllowedImageType(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function isAllowedDocumentType(mimeType: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType);
}

export function isAllowedAudioType(mimeType: string): boolean {
  return (ALLOWED_AUDIO_TYPES as readonly string[]).includes(mimeType);
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
  category: "image" | "document" | "evidence";
  maxSizeBytes?: number;
}): { ok: true } | { ok: false; error: string } {
  const { filename, mimeType, fileSize, category, maxSizeBytes } = params;

  if (!isAllowedExtension(filename)) {
    return { ok: false, error: "That file type isn't supported." };
  }

  // Evidence for a barrier report: a photo of it, a recording describing it,
  // or a document. The caller's own list narrows this further.
  if (category === "evidence") {
    if (!isAllowedImageType(mimeType) && !isAllowedAudioType(mimeType) && !isAllowedDocumentType(mimeType)) {
      return { ok: false, error: "Attach a photo, a voice recording or a PDF." };
    }
    const limit = maxSizeBytes ?? MAX_AUDIO_SIZE_BYTES;
    if (fileSize > limit) {
      return { ok: false, error: `Attachments must be ${Math.round(limit / (1024 * 1024))} MB or smaller.` };
    }
    return { ok: true };
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

/**
 * Magic-byte sniff for the document formats we accept.
 *
 * Counterpart to sniffImageMimeType, and needed for the same reason: once
 * enrollment uploads go straight from the browser to R2, the server never
 * sees the bytes in transit, so the only trustworthy statement about what a
 * file *is* comes from reading it back out of storage. The browser-reported
 * Content-Type is a claim, not evidence.
 *
 * Returns a family rather than an exact type for container formats — a .docx,
 * .xlsx, .pptx and .zip are all ZIP archives and indistinguishable this
 * cheaply, so they share "application/zip". Callers should treat a match as
 * "the bytes are consistent with the declared type", not as an exact identity.
 */
export function sniffDocumentMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf"; // %PDF
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return "application/zip"; // PK.. — docx/xlsx/pptx/zip
  }
  // D0 CF 11 E0 A1 B1 1A E1 — the OLE compound file header shared by the
  // pre-2007 Office formats (.doc/.xls/.ppt).
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1
  ) {
    return "application/msword";
  }
  return null;
}

/**
 * Magic-byte sniff for the recording formats we accept. Same purpose as the
 * document sniff: the browser's Content-Type is a claim, and the only
 * evidence is the bytes.
 *
 * Like documents, this returns a family rather than an exact type. An MP4
 * container holds audio or video depending on its brand, and Ogg and WebM
 * are containers too — so a match means "the bytes are consistent with a
 * recording of the declared type", which is what the caller needs to know.
 */
export function sniffAudioMimeType(bytes: Uint8Array): string | null {
  // "ID3" tag, or an MPEG frame sync (11 set bits) — both mean MP3 here.
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  // "RIFF" .... "WAVE"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return "audio/wav";
  }
  // "OggS"
  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return "audio/ogg";
  }
  // "ftyp" at offset 4 — the ISO base media container (.m4a, .mp4).
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return "audio/mp4";
  }
  // EBML header — Matroska/WebM.
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "audio/webm";
  }
  return null;
}

/** ZIP- and OLE-based Office types that a container sniff can legitimately back. */
const ZIP_BACKED_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

const OLE_BACKED_TYPES = new Set([
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

/**
 * True when the bytes on disk are consistent with `declaredType`.
 *
 * Images must sniff to exactly the declared type. Documents may sniff to
 * their container family (see sniffDocumentMimeType). Anything that sniffs to
 * nothing recognisable is rejected outright, which is the point: it means we
 * could not confirm the file is what it claims to be.
 */
export function bytesMatchDeclaredType(bytes: Uint8Array, declaredType: string): boolean {
  const image = sniffImageMimeType(bytes);
  if (image) return image === declaredType;

  if (isAllowedAudioType(declaredType)) {
    const audio = sniffAudioMimeType(bytes);
    // An MP4/Ogg/WebM container can legitimately be labelled as either its
    // own type or the codec-specific one a phone chose, so a recording only
    // has to sniff as SOME recording.
    return audio !== null;
  }

  const doc = sniffDocumentMimeType(bytes);
  if (!doc) return false;
  if (doc === declaredType) return true;
  if (doc === "application/zip") return ZIP_BACKED_TYPES.has(declaredType);
  if (doc === "application/msword") return OLE_BACKED_TYPES.has(declaredType);
  return false;
}
