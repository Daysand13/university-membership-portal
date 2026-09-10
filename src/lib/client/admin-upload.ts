"use client";

import { downscaleImage } from "@/lib/client/downscale-image";
import { resolveMimeType } from "@/lib/client/upload-attachment";
import type { UploadTicketResult } from "@/lib/actions/media-actions";

/**
 * Shared upload path for every admin file field (news cover, event banner,
 * team photo, hero slide, logo, library document, rich-text image).
 *
 * It exists because each field previously rolled its own handler and they
 * all had the same two faults:
 *
 *   1. A photo straight off a phone is routinely 4–12MB, over the 5MB image
 *      limit, so the upload was refused. The public enrollment form had
 *      solved this a long time ago by re-encoding in the browser; the admin
 *      fields never got that, so admins hit a wall the applicants didn't.
 *      Images are downscaled here first, so an ordinary camera photo just
 *      works instead of needing an external compression tool.
 *
 *   2. Every failure was reported as "Cloudflare R2 isn't configured",
 *      whatever had actually gone wrong — an oversized file, an unsupported
 *      format, a dropped connection. That message sent people to check
 *      Cloudflare for problems that had nothing to do with it. Each failure
 *      now says what actually happened.
 *
 * Some Android file providers hand back a File with an empty `type`, which
 * fails the server's format check for no good reason, so the mime type is
 * resolved from the extension the same way the enrollment upload does.
 */

/**
 * Set just under the server's 5MB image limit rather than at some tidier,
 * smaller number, because downscaleImage leaves a file alone entirely when
 * it is already under target and re-encodes to JPEG when it isn't.
 *
 * A lower target would mean routinely re-encoding files that were fine —
 * and re-encoding a transparent PNG to JPEG replaces the transparency with
 * a solid background. A logo silently gaining a black box behind it is a
 * far worse outcome than a large upload. At this threshold, anything the
 * server would have accepted passes through untouched, and only a file
 * that would otherwise be rejected outright gets re-encoded.
 */
const ADMIN_IMAGE_TARGET_BYTES = Math.floor(4.5 * 1024 * 1024);

export type AdminUploadResult =
  | { ok: true; publicUrl: string; objectKey: string; mimeType: string; fileSize: number; filename: string }
  | { ok: false; error: string };

export async function uploadAdminFile(params: {
  file: File;
  kind: "image" | "document";
  requestTicket: (input: {
    filename: string;
    mimeType: string;
    fileSize: number;
  }) => Promise<UploadTicketResult>;
}): Promise<AdminUploadResult> {
  const { file, kind, requestTicket } = params;

  // Documents are uploaded untouched — only imagery can be re-encoded.
  const prepared = kind === "image" ? await downscaleImage(file, { targetBytes: ADMIN_IMAGE_TARGET_BYTES }) : file;
  const mimeType = resolveMimeType(prepared);

  let ticket: UploadTicketResult;
  try {
    ticket = await requestTicket({ filename: prepared.name, mimeType, fileSize: prepared.size });
  } catch (err) {
    console.error("[admin-upload] could not get an upload ticket", err);
    return {
      ok: false,
      error: "We couldn't start the upload. Please check your connection and try again.",
    };
  }

  // A rejected file arrives as a normal answer carrying the actual reason.
  if (!ticket.ok) return { ok: false, error: ticket.error };

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: prepared,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[admin-upload] storage rejected the upload", response.status, detail.slice(0, 300));
      return { ok: false, error: "The file didn't save. Please try uploading it again." };
    }
  } catch (err) {
    // fetch() rejects rather than returning a response when the request
    // never completed — offline, or blocked before it was sent. In practice
    // the second usually means the bucket's CORS policy doesn't list this
    // origin, so log the origin: it's the detail that tells them apart.
    console.error("[admin-upload] upload request did not complete", {
      pageOrigin: typeof location === "undefined" ? null : location.origin,
      hint: "if this is a CORS block, add the origin above to the R2 bucket's AllowedOrigins",
      err,
    });
    return {
      ok: false,
      error: "The upload didn't finish. Please check your connection and try again.",
    };
  }

  return {
    ok: true,
    publicUrl: ticket.publicUrl,
    objectKey: ticket.objectKey,
    mimeType,
    fileSize: prepared.size,
    filename: prepared.name,
  };
}
