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

/**
 * A direct-to-R2 PUT is a real photo (often several MB even after
 * downscaling) going straight from the admin's own connection to
 * Cloudflare, with no server in between to retry on their behalf — so a
 * single dropped packet, a WiFi hiccup, or a moment of campus-network
 * congestion surfaces immediately as a failed upload. Confirmed this is
 * not a CORS or configuration problem (a live test upload from the
 * production domain succeeded cleanly); a brief connection blip mid-upload
 * is the ordinary cause, and retrying automatically is the standard fix —
 * the same thing a person does by hand when told to "try again", just
 * without making them do it.
 */
const MAX_UPLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = [600, 1800]; // between attempt 1→2 and 2→3

/**
 * Ceiling for the same-origin fallback below. Vercel refuses a request
 * body over 4.5MB before our code runs at all, so this leaves room for
 * multipart overhead underneath that.
 */
const FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

/** Re-encode target when an image is too big for the fallback — smaller
 *  than FALLBACK_MAX_BYTES so the multipart body clears the cap. */
const FALLBACK_IMAGE_TARGET_BYTES = Math.floor(3.5 * 1024 * 1024);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends the file to our own server, which puts it in R2 for us.
 *
 * This exists because the normal direct-to-R2 upload is cross-origin, and
 * some Android in-app browsers — a link opened inside WhatsApp or
 * Facebook, which is how most people on Android open links — send
 * `Origin: null` on cross-origin requests. R2 refuses a null origin, so
 * the browser blocks the PUT before it ever leaves the phone, and it
 * surfaces as a dropped connection. Confirmed against the live bucket:
 * the real site origins preflight fine, `null` gets a 403.
 *
 * A same-origin request has no CORS check at all, so it works in any
 * browser or WebView. It's the fallback rather than the default only
 * because everything sent this way counts against Vercel's body cap.
 */
async function uploadViaServer(params: {
  file: File;
  kind: "image" | "document";
  mimeType: string;
  category: string | undefined;
}): Promise<AdminUploadResult> {
  const { file, kind, mimeType, category } = params;

  // Re-encode an oversized image rather than give up — losing PNG
  // transparency beats not being able to upload at all, and this only
  // happens once the direct path has already failed.
  let prepared = file;
  if (prepared.size > FALLBACK_MAX_BYTES && kind === "image") {
    prepared = await downscaleImage(prepared, { targetBytes: FALLBACK_IMAGE_TARGET_BYTES });
  }
  if (prepared.size > FALLBACK_MAX_BYTES) {
    return {
      ok: false,
      error:
        "The upload didn't finish, and this file is too large to send another way. Please try a smaller file, or use a different browser.",
    };
  }

  const body = new FormData();
  body.append("file", prepared);
  body.append("kind", kind);
  body.append("mimeType", mimeType);
  if (category) body.append("category", category);

  try {
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const json = (await response.json().catch(() => null)) as
      | { ok: true; publicUrl: string; objectKey: string; mimeType: string; fileSize: number; filename: string }
      | { ok: false; error: string }
      | null;

    if (!response.ok || !json || !json.ok) {
      const message = json && !json.ok ? json.error : "We couldn't save that file. Please try again.";
      console.error("[admin-upload] same-origin fallback failed", response.status, message);
      return { ok: false, error: message };
    }
    return {
      ok: true,
      publicUrl: json.publicUrl,
      objectKey: json.objectKey,
      mimeType: json.mimeType,
      fileSize: json.fileSize,
      filename: json.filename,
    };
  } catch (err) {
    console.error("[admin-upload] same-origin fallback did not complete", err);
    return {
      ok: false,
      error: "The upload didn't finish. Please check your connection and try again.",
    };
  }
}

export type AdminUploadResult =
  | { ok: true; publicUrl: string; objectKey: string; mimeType: string; fileSize: number; filename: string }
  | { ok: false; error: string };

export async function uploadAdminFile(params: {
  file: File;
  kind: "image" | "document";
  /** Which R2 folder an image belongs in. Passed through to the
   *  same-origin fallback, which has to work it out server-side. */
  category?: string;
  requestTicket: (input: {
    filename: string;
    mimeType: string;
    fileSize: number;
  }) => Promise<UploadTicketResult>;
}): Promise<AdminUploadResult> {
  const { file, kind, category, requestTicket } = params;

  // Documents are uploaded untouched — only imagery can be re-encoded.
  const prepared = kind === "image" ? await downscaleImage(file, { targetBytes: ADMIN_IMAGE_TARGET_BYTES }) : file;
  const mimeType = resolveMimeType(prepared);

  // Requesting the ticket is a normal network round trip too (a Server
  // Action call), so it's just as exposed to a brief connection drop as
  // the R2 PUT below — same retry treatment.
  let ticket: UploadTicketResult | undefined;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    try {
      ticket = await requestTicket({ filename: prepared.name, mimeType, fileSize: prepared.size });
      break;
    } catch (err) {
      console.error(`[admin-upload] could not get an upload ticket (attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS})`, err);
      if (attempt === MAX_UPLOAD_ATTEMPTS) {
        return {
          ok: false,
          error: "We couldn't start the upload after a few tries. Please check your connection and try again.",
        };
      }
      await sleep(RETRY_DELAY_MS[attempt - 1]);
    }
  }
  if (!ticket) {
    // Unreachable in practice — the loop above either returns or breaks
    // with `ticket` set — but keeps TypeScript honest about the type.
    return { ok: false, error: "We couldn't start the upload. Please try again." };
  }

  // A rejected file arrives as a normal answer carrying the actual reason.
  if (!ticket.ok) return { ok: false, error: ticket.error };

  // The same presigned URL can be PUT to more than once before it expires
  // (R2/S3 don't invalidate it after one use), so a retry needs no new
  // ticket — it just tries the exact same request again.
  let directUploadWorked = false;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: prepared,
      });
    } catch (err) {
      // fetch() rejects rather than returning a response when the request
      // never completed. That's either a dropped connection or — the case
      // that brought us here — the browser refusing to send it at all
      // because R2's CORS policy doesn't cover this page's origin, which
      // is what happens inside Android in-app browsers that report
      // `Origin: null`. Retrying helps the first; only the same-origin
      // fallback below helps the second, and from here they're
      // indistinguishable, so try both in that order.
      console.error(`[admin-upload] upload request did not complete (attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS})`, {
        pageOrigin: typeof location === "undefined" ? null : location.origin,
        err,
      });
      if (attempt === MAX_UPLOAD_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS[attempt - 1]);
      continue;
    }

    if (!response.ok) {
      // Storage answered and refused. Retrying the identical request won't
      // change that, but the server-side path signs its own request and
      // may well succeed, so fall through to it rather than stopping.
      const detail = await response.text().catch(() => "");
      console.error("[admin-upload] storage rejected the upload", response.status, detail.slice(0, 300));
      break;
    }

    directUploadWorked = true;
    break;
  }

  if (!directUploadWorked) {
    return uploadViaServer({ file: prepared, kind, mimeType, category });
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
