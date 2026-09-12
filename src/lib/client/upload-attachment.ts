import { downscaleImage } from "@/lib/client/downscale-image";
import { readFileIntoMemory, FILE_READ_FAILED_MESSAGE } from "@/lib/client/read-file";
import type { EnrollmentUploadKind, EnrollmentUploadTicket } from "@/lib/services/enrollment-upload-service";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Some Android file providers hand back a File with an empty `type`. Falling
 * back to the extension keeps those selections usable; the server verifies the
 * actual bytes either way, so a wrong guess is caught rather than trusted.
 */
export function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "";
}

export type UploadOutcome =
  | { status: "ready"; bytes: number; token: string; filename: string; file: File }
  /** R2 isn't configured (local development) — carry on without storing anything. */
  | { status: "skipped"; bytes: number; filename: string; file: File }
  | { status: "error"; message: string };

type RequestUploadTicket = (input: {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  fileSize: number;
}) => Promise<EnrollmentUploadTicket>;

/**
 * Re-encodes an image where possible, then uploads it straight to R2 and
 * returns the signed ticket naming the stored object.
 *
 * The file bytes never touch the Next.js server: they cannot, because Vercel
 * rejects a Function request body over 4.5MB before the function runs, and
 * these forms accept files that alone exceed that. The form submission
 * carries only the ticket.
 *
 * Shared by the public enrollment form and the alumni further-studies form —
 * `requestTicket` is whichever server action issues the ticket for that
 * form's caller (an anonymous applicant vs. a signed-in alumnus), since the
 * upload mechanics themselves don't depend on who's asking.
 */
export async function prepareAndUpload(
  kind: EnrollmentUploadKind,
  file: File,
  targetBytes: number,
  requestTicket: RequestUploadTicket,
): Promise<UploadOutcome> {
  // Read once, up front: an Android file handle can stop being readable
  // mid-upload, which fails every retry like a dropped connection would.
  // See lib/client/read-file.ts.
  const read = await readFileIntoMemory(file, resolveMimeType(file));
  if (!read.ok) return { status: "error", message: FILE_READ_FAILED_MESSAGE };

  const prepared = await downscaleImage(read.file, { targetBytes });
  const mimeType = resolveMimeType(prepared);

  let ticket: EnrollmentUploadTicket;
  try {
    ticket = await requestTicket({
      kind,
      filename: prepared.name,
      mimeType,
      fileSize: prepared.size,
    });
  } catch {
    return {
      status: "error",
      message: "We couldn't start the upload. Please check your connection and try again.",
    };
  }

  if (!ticket.ok) return { status: "error", message: ticket.error };
  if (ticket.mode === "skip") {
    return { status: "skipped", bytes: prepared.size, filename: prepared.name, file: prepared };
  }

  let directUploadWorked = false;
  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: prepared,
    });
    if (response.ok) {
      directUploadWorked = true;
    } else {
      // Storage answered and refused: an expired URL or a signature
      // mismatch. Retrying the identical request won't change that, but the
      // server-side path signs its own and may well succeed, so fall
      // through to it rather than stopping here.
      const detail = await response.text().catch(() => "");
      console.error("[upload-attachment] storage rejected the upload", response.status, detail.slice(0, 300));
    }
  } catch (err) {
    // fetch() rejects rather than returning a response when the request never
    // completed at all — genuinely offline, or blocked by the browser before
    // it was sent. The second is the common one: R2's CORS policy can't cover
    // an Android in-app browser, which reports `Origin: null` and gets a 403,
    // so the upload never leaves the phone. The fallback below is same-origin
    // and has no CORS check to fail.
    console.error("[upload-attachment] upload request did not complete", {
      pageOrigin: typeof location === "undefined" ? null : location.origin,
      err,
    });
  }

  if (!directUploadWorked) {
    return uploadViaServer(kind, prepared, mimeType);
  }

  return {
    status: "ready",
    bytes: prepared.size,
    token: ticket.token,
    filename: prepared.name,
    file: prepared,
  };
}

/**
 * Ceiling for the same-origin fallback. Vercel refuses a request body over
 * 4.5MB before our code runs, so this leaves room for multipart overhead
 * underneath that. A re-encoded passport photo is well under it; a 5MB PDF
 * medical report is not, which is the one case the fallback can't rescue.
 */
const FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Sends the file to our own server, which stores it in R2 and returns the
 * same signed ticket the presigned path would have. Used only after the
 * direct upload has actually failed — see the catch above for why that
 * happens on Android.
 */
async function uploadViaServer(
  kind: EnrollmentUploadKind,
  file: File,
  mimeType: string,
): Promise<UploadOutcome> {
  if (file.size > FALLBACK_MAX_BYTES) {
    return {
      status: "error",
      message:
        "That file didn't finish uploading, and it's too large to send another way. Please attach a smaller file and try again.",
    };
  }

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  body.append("mimeType", mimeType);

  try {
    const response = await fetch("/api/enrollment/upload", { method: "POST", body });
    const json = (await response.json().catch(() => null)) as
      | { ok: true; token: string; bytes: number; filename: string }
      | { ok: false; error: string }
      | null;

    if (!response.ok || !json || !json.ok) {
      const message =
        json && !json.ok ? json.error : "We couldn't save that file. Please try attaching it again.";
      console.error("[upload-attachment] same-origin fallback failed", response.status, message);
      return { status: "error", message };
    }
    return { status: "ready", bytes: json.bytes, token: json.token, filename: json.filename, file };
  } catch (err) {
    console.error("[upload-attachment] same-origin fallback did not complete", err);
    return {
      status: "error",
      message: "That file didn't finish uploading. Please check your connection and try again.",
    };
  }
}
