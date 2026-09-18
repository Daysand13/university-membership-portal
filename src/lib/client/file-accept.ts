/**
 * The `accept` list for the medical report field — one field that has to
 * take a saved PDF or Word file AND a photo of a paper report, on every
 * phone.
 *
 * On Android the accept list isn't a filter so much as an instruction for
 * which picker to open, and Chrome's rules (ui/android/.../SelectFileDialog.java)
 * make the obvious list a dead end on Samsung phones:
 *
 *   - If ANY image type is listed — or the list is empty, or has star/star —
 *     Chrome adds a camera shortcut and shows Android's "Choose an action"
 *     sheet. Samsung's One UI fills that sheet with Camera, Camcorder, Voice
 *     Recorder and Photos, with no route to My Files. That is why a mixed
 *     list, and then no list at all, both failed on real Samsung phones.
 *   - A list of document types opens the file browser directly. It also
 *     passes those types on as a filter, so photos appear greyed out.
 *   - If the list contains application/octet-stream, Chrome drops the
 *     filter entirely (it treats that type as "any file") while still
 *     adding no camera shortcut, because no image type was named.
 *
 * So Android gets the document types plus application/octet-stream: the
 * file browser, reachable on Samsung, with PDFs, Word files and photos all
 * selectable. In-app browsers built on Android WebView keep the document
 * types (WebView ignores types it doesn't map), so a PDF is always
 * reachable there too.
 *
 * iPhones and computers get documents plus images. iOS reads that as "offer
 * Photo Library, Take Photo and Choose File", and listing concrete image
 * types (not image/*) makes it convert a HEIC photo to JPEG when it's picked.
 *
 * Whatever is picked is checked again here and on the server, so a looser
 * picker never means a wrong file gets through.
 */

const DOCUMENT_TYPES = [
  "application/pdf",
  ".pdf",
  "application/msword",
  ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".docx",
];

const IMAGE_TYPES = ["image/jpeg", ".jpg", ".jpeg", "image/png", ".png"];

export const MEDICAL_REPORT_ACCEPT_ANDROID = [...DOCUMENT_TYPES, "application/octet-stream"].join(",");
export const MEDICAL_REPORT_ACCEPT_OTHER = [...DOCUMENT_TYPES, ...IMAGE_TYPES].join(",");

/** MIME types the medical report may actually be, after extension fallback. */
export const MEDICAL_REPORT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
  userAgentData?: { platform?: string } | null;
}

/**
 * Android, including Samsung Internet and in-app browsers, and including a
 * phone showing the "desktop site" (which reports itself as Linux, but still
 * has a touch screen and still opens Android's pickers).
 */
export function isAndroidDevice(nav: NavigatorLike | undefined): boolean {
  if (!nav) return false;
  if (nav.userAgentData?.platform === "Android") return true;
  if (/Android/i.test(nav.userAgent)) return true;
  return /Linux/i.test(nav.userAgent) && !/CrOS/i.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 0;
}

export function medicalReportAccept(android: boolean): string {
  return android ? MEDICAL_REPORT_ACCEPT_ANDROID : MEDICAL_REPORT_ACCEPT_OTHER;
}

/**
 * A person-readable reason this file can't be a medical report, or null if
 * it can. `mimeType` is the type after the extension fallback in
 * resolveMimeType; an empty one is left for the server to judge from the
 * file's bytes.
 */
export function medicalReportFileProblem(file: { name: string; size: number }, mimeType: string): string | null {
  if (file.size === 0) return "That file is empty. Please choose a different file.";
  if (!mimeType) return null;
  if ((MEDICAL_REPORT_MIME_TYPES as readonly string[]).includes(mimeType)) return null;
  if (/hei[cf]/i.test(mimeType) || /\.hei[cf]$/i.test(file.name)) {
    return "That photo is in HEIC format, which can't be uploaded. Please choose a JPG or PNG photo, or a PDF of the report.";
  }
  return "That type of file can't be used. Please choose a PDF or Word document, or a JPG or PNG photo of the report.";
}

const OFFICE_TYPES = [
  "application/vnd.ms-excel",
  ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xlsx",
  "application/vnd.ms-powerpoint",
  ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pptx",
];

/**
 * The `accept` list for a patron's document (a letter, statement or policy
 * template). Same reasoning as the medical report above: on Android, no
 * image types plus application/octet-stream, so Samsung phones open the
 * file browser with everything selectable.
 */
export function patronDocumentAccept(android: boolean): string {
  return android
    ? [...DOCUMENT_TYPES, ...OFFICE_TYPES, "application/octet-stream"].join(",")
    : [...DOCUMENT_TYPES, ...OFFICE_TYPES, ...IMAGE_TYPES].join(",");
}

const AUDIO_TYPES = [
  "audio/mpeg",
  ".mp3",
  "audio/mp4",
  ".m4a",
  "audio/wav",
  ".wav",
  "audio/ogg",
  ".ogg",
  "audio/webm",
  ".weba",
];

/**
 * The `accept` list for evidence on a barrier report: a photo of the
 * barrier, a voice note describing it, or a PDF.
 *
 * Android gets documents plus application/octet-stream for the reason
 * above — the file browser, with everything selectable, reachable on
 * Samsung. Listing audio types there would only add a Voice Recorder
 * shortcut to the same sheet that hides My Files. On everything else,
 * naming the audio types is what makes a saved recording selectable
 * alongside photos.
 */
export function barrierEvidenceAccept(android: boolean): string {
  return android
    ? [...DOCUMENT_TYPES, "application/octet-stream"].join(",")
    : ["application/pdf", ".pdf", ...IMAGE_TYPES, ...AUDIO_TYPES].join(",");
}
