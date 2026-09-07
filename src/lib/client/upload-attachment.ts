import { downscaleImage } from "@/lib/client/downscale-image";
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
  const prepared = await downscaleImage(file, { targetBytes });
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

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: prepared,
    });
    if (!response.ok) {
      // Storage answered and refused: an expired URL or a signature mismatch,
      // not a connectivity problem. Worth separating, because the person
      // retrying won't help and the log line says why.
      const detail = await response.text().catch(() => "");
      console.error("[upload-attachment] storage rejected the upload", response.status, detail.slice(0, 300));
      return { status: "error", message: "We couldn't save that file. Please try attaching it again." };
    }
  } catch (err) {
    // fetch() rejects rather than returning a response when the request never
    // completed at all — genuinely offline, or blocked by the browser before
    // it was sent. In practice the second is far more likely, and means the
    // bucket's CORS policy doesn't list this origin (see the CORS step in
    // README.md). That's a deployment configuration problem, and from here it
    // is indistinguishable from a dropped connection — so log the origin,
    // which is the one detail that tells the two apart in a bug report.
    console.error("[upload-attachment] upload request did not complete", {
      pageOrigin: typeof location === "undefined" ? null : location.origin,
      hint: "if this is a CORS block, add the origin above to the R2 bucket's AllowedOrigins",
      err,
    });
    return {
      status: "error",
      message: "That file didn't finish uploading. Please check your connection and try again.",
    };
  }

  return {
    status: "ready",
    bytes: prepared.size,
    token: ticket.token,
    filename: prepared.name,
    file: prepared,
  };
}
