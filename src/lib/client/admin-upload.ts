"use client";

import { downscaleImage } from "@/lib/client/downscale-image";
import { resolveMimeType } from "@/lib/client/upload-attachment";
import { readFileIntoMemory, FILE_READ_FAILED_MESSAGE } from "@/lib/client/read-file";
import { sendWithProgress, describeTransfer } from "@/lib/client/xhr-upload";
import type { UploadTicketResult } from "@/lib/actions/media-actions";

/**
 * Shared upload path for every admin file field (news cover, event banner,
 * team photo, hero slide, logo, library document, rich-text image).
 *
 * Images are re-encoded in the browser first, and every failure says what
 * actually happened rather than one generic message.
 *
 * Admins kept seeing "the upload didn't finish" after a few tries, mostly on
 * Android. There was no single cause, so each one gets its own layer, and
 * each layer is cheap on a connection where nothing goes wrong:
 *
 *   1. The ticket comes from a route handler, not a Server Action. Action IDs
 *      change with every deployment, so a phone tab left open across a deploy
 *      failed every attempt identically. See api/admin/upload/ticket.
 *   2. The chosen file is read into memory before anything is sent. Android
 *      file handles (Google Photos, Drive, gallery apps) can stop being
 *      readable mid-upload, which looks exactly like a dropped connection and
 *      fails every retry the same way. See lib/client/read-file.ts.
 *   3. Camera photos are shrunk to a size that suits the web (see
 *      prepareImage). A 1.5MB upload finishes on a weak mobile signal where a
 *      4.5MB one keeps dying partway.
 *   4. Uploads report progress and detect stalls rather than hanging on a
 *      spinner (lib/client/xhr-upload.ts).
 *   5. If the direct-to-R2 upload still fails — including when an Android
 *      in-app browser's `Origin: null` gets it refused by R2's CORS policy —
 *      the same bytes go through our own server instead.
 *   6. A failure that survives all of that is reported back with its details
 *      (api/admin/upload/diagnostics), so the next diagnosis has evidence.
 */

/** Camera photos (JPEG) above this are re-encoded. JPEG to JPEG, so nothing
 *  is lost that the source had — just resolution and bytes the web page
 *  never needed. 1.5MB at 2560px is visually indistinguishable on a page. */
const JPEG_TARGET_BYTES = Math.floor(1.5 * 1024 * 1024);

/**
 * Other formats are left alone unless the server would refuse them outright.
 * Re-encoding outputs JPEG, and a transparent PNG logo silently gaining a
 * solid box behind it is a far worse outcome than a large upload — so only a
 * file that would otherwise be rejected is touched.
 */
const OTHER_IMAGE_TARGET_BYTES = Math.floor(4.5 * 1024 * 1024);

/** Longest edge after re-encoding; wide enough for a full-width hero image. */
const IMAGE_MAX_DIMENSION = 2560;

const TICKET_ATTEMPTS = 3;
const DIRECT_ATTEMPTS = 2;
const FALLBACK_ATTEMPTS = 2;
const RETRY_DELAY_MS = [800, 2000]; // before attempt 2, before attempt 3

/** No bytes moving for this long means the connection has hung. */
const STALL_TIMEOUT_MS = 45_000;

/**
 * Ceiling for the same-origin fallback. Vercel refuses a request body over
 * 4.5MB before our code runs at all, so this leaves room for multipart
 * overhead underneath that.
 */
const FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

/** Re-encode target when an image is too big for the fallback. */
const FALLBACK_IMAGE_TARGET_BYTES = Math.floor(3.5 * 1024 * 1024);

const OFFLINE_MESSAGE = "You're offline. Reconnect to the internet, then try the upload again.";
const SESSION_EXPIRED_MESSAGE = "Your admin session has expired. Sign in again in a new tab, then retry the upload.";
const GAVE_UP_MESSAGE =
  "The upload couldn't be completed after several attempts, so nothing was saved. Please check your connection and try again — switching between Wi-Fi and mobile data can help.";
const TOO_LARGE_FOR_FALLBACK_MESSAGE =
  "This file couldn't be uploaded over your current connection, and it's too large to send another way. Please try a file under 4 MB, or try again on a different network.";

export type AdminUploadResult =
  | { ok: true; publicUrl: string; objectKey: string; mimeType: string; fileSize: number; filename: string }
  | { ok: false; error: string };

type TrailEntry = { stage: "read" | "ticket" | "direct" | "fallback"; attempt: number; outcome: string };

type TicketOutcome =
  | { kind: "ticket"; ticket: UploadTicketResult }
  | { kind: "session-expired" }
  | { kind: "unreachable" };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function prepareImage(file: File): Promise<File> {
  const targetBytes = file.type === "image/jpeg" ? JPEG_TARGET_BYTES : OTHER_IMAGE_TARGET_BYTES;
  return downscaleImage(file, { targetBytes, maxDimension: IMAGE_MAX_DIMENSION });
}

/** Fire-and-forget: a failed report must never become a second error. */
function reportFailure(details: {
  kind: string;
  category?: string;
  mimeType?: string;
  fileSize?: number;
  originalSize?: number;
  finalError: string;
  trail: TrailEntry[];
}) {
  try {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    const body = JSON.stringify({
      ...details,
      online: navigator.onLine,
      connection: connection?.effectiveType ?? null,
      userAgent: navigator.userAgent,
      page: location.pathname,
    });
    void fetch("/api/admin/upload/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nothing useful to do — the person already has their error message.
  }
}

async function requestTicket(
  input: { kind: "image" | "document"; category?: string; filename: string; mimeType: string; fileSize: number },
  trail: TrailEntry[],
): Promise<TicketOutcome> {
  for (let attempt = 1; attempt <= TICKET_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("/api/admin/upload/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      if (response.status === 401) return { kind: "session-expired" };

      const json = (await response.json().catch(() => null)) as UploadTicketResult | null;
      if (response.ok && json && typeof json.ok === "boolean") return { kind: "ticket", ticket: json };

      trail.push({ stage: "ticket", attempt, outcome: `HTTP ${response.status}` });
      // Any other 4xx is a request the server will refuse however often it
      // is sent; the fallback path validates independently, so go there.
      if (response.status >= 400 && response.status < 500) return { kind: "unreachable" };
    } catch (err) {
      trail.push({ stage: "ticket", attempt, outcome: `network-error (${describeError(err)})` });
    }
    if (attempt < TICKET_ATTEMPTS) await sleep(RETRY_DELAY_MS[attempt - 1]);
  }
  return { kind: "unreachable" };
}

async function uploadDirect(params: {
  uploadUrl: string;
  file: File;
  mimeType: string;
  onProgress?: (fraction: number) => void;
  trail: TrailEntry[];
}): Promise<boolean> {
  const { uploadUrl, file, mimeType, onProgress, trail } = params;

  // The same presigned URL can be PUT to more than once before it expires,
  // so a retry needs no new ticket.
  for (let attempt = 1; attempt <= DIRECT_ATTEMPTS; attempt++) {
    onProgress?.(0);
    const outcome = await sendWithProgress({
      method: "PUT",
      url: uploadUrl,
      body: file,
      headers: { "Content-Type": mimeType },
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onProgress,
    });

    if (outcome.kind === "response" && outcome.status >= 200 && outcome.status < 300) return true;

    const detail = outcome.kind === "response" ? ` ${outcome.body.slice(0, 200)}` : "";
    trail.push({ stage: "direct", attempt, outcome: `${describeTransfer(outcome)}${detail}` });
    console.error(`[admin-upload] direct upload failed (attempt ${attempt}/${DIRECT_ATTEMPTS})`, outcome);

    // Storage answered and refused (an expired or mismatched signature).
    // The identical request will be refused again; the server path signs
    // its own, so move on to it.
    if (outcome.kind === "response") return false;
    if (attempt < DIRECT_ATTEMPTS) await sleep(RETRY_DELAY_MS[attempt - 1]);
  }
  return false;
}

/**
 * Sends the file to our own server, which puts it in R2.
 *
 * Same-origin, so no CORS check applies — this is what rescues an Android
 * in-app browser whose `Origin: null` R2 refuses. It's the fallback rather
 * than the default only because everything sent this way counts against
 * Vercel's request body cap.
 */
async function uploadViaServer(params: {
  file: File;
  kind: "image" | "document";
  mimeType: string;
  category: string | undefined;
  onProgress?: (fraction: number) => void;
  trail: TrailEntry[];
}): Promise<AdminUploadResult> {
  const { kind, category, onProgress, trail } = params;

  let file = params.file;
  let mimeType = params.mimeType;
  if (file.size > FALLBACK_MAX_BYTES && kind === "image") {
    // Losing PNG transparency beats not being able to upload at all, and
    // this only happens once the direct path has already failed.
    file = await downscaleImage(file, { targetBytes: FALLBACK_IMAGE_TARGET_BYTES, maxDimension: IMAGE_MAX_DIMENSION });
    mimeType = resolveMimeType(file);
  }
  if (file.size > FALLBACK_MAX_BYTES) {
    return { ok: false, error: TOO_LARGE_FOR_FALLBACK_MESSAGE };
  }

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  body.append("mimeType", mimeType);
  if (category) body.append("category", category);

  type FallbackResponse =
    | { ok: true; publicUrl: string; objectKey: string; mimeType: string; fileSize: number; filename: string }
    | { ok: false; error: string };

  for (let attempt = 1; attempt <= FALLBACK_ATTEMPTS; attempt++) {
    onProgress?.(0);
    const outcome = await sendWithProgress({
      method: "POST",
      url: "/api/admin/upload",
      body,
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onProgress,
    });

    if (outcome.kind === "response") {
      const json = parseJson<FallbackResponse>(outcome.body);
      if (outcome.status >= 200 && outcome.status < 300 && json?.ok) {
        onProgress?.(1);
        return {
          ok: true,
          publicUrl: json.publicUrl,
          objectKey: json.objectKey,
          mimeType: json.mimeType,
          fileSize: json.fileSize,
          filename: json.filename,
        };
      }
      trail.push({ stage: "fallback", attempt, outcome: describeTransfer(outcome) });
      if (outcome.status === 401) return { ok: false, error: SESSION_EXPIRED_MESSAGE };
      if (outcome.status === 413) return { ok: false, error: TOO_LARGE_FOR_FALLBACK_MESSAGE };
      // A 4xx with a reason is the file being refused — say why, don't retry.
      if (outcome.status < 500 && json && !json.ok) return { ok: false, error: json.error };
    } else {
      trail.push({ stage: "fallback", attempt, outcome: describeTransfer(outcome) });
    }

    console.error(`[admin-upload] same-origin fallback failed (attempt ${attempt}/${FALLBACK_ATTEMPTS})`, outcome);
    if (attempt < FALLBACK_ATTEMPTS) await sleep(RETRY_DELAY_MS[attempt - 1]);
  }

  return { ok: false, error: isOffline() ? OFFLINE_MESSAGE : GAVE_UP_MESSAGE };
}

export async function uploadAdminFile(params: {
  file: File;
  kind: "image" | "document";
  /** Which R2 folder an image belongs in (a MediaCategory). */
  category?: string;
  /** 0–1 for whichever transfer is currently running. */
  onProgress?: (fraction: number) => void;
}): Promise<AdminUploadResult> {
  const { file, kind, category, onProgress } = params;
  const trail: TrailEntry[] = [];

  if (isOffline()) return { ok: false, error: OFFLINE_MESSAGE };

  const read = await readFileIntoMemory(file, resolveMimeType(file));
  if (!read.ok) {
    trail.push({ stage: "read", attempt: 1, outcome: "unreadable" });
    reportFailure({ kind, category, mimeType: file.type, originalSize: file.size, finalError: FILE_READ_FAILED_MESSAGE, trail });
    return { ok: false, error: FILE_READ_FAILED_MESSAGE };
  }
  if (read.file.size === 0) {
    return { ok: false, error: "That file is empty. Please choose a different file." };
  }

  // Documents are uploaded untouched — only imagery can be re-encoded.
  const prepared = kind === "image" ? await prepareImage(read.file) : read.file;
  const mimeType = resolveMimeType(prepared);

  const ticketOutcome = await requestTicket(
    { kind, category, filename: prepared.name, mimeType, fileSize: prepared.size },
    trail,
  );
  if (ticketOutcome.kind === "session-expired") return { ok: false, error: SESSION_EXPIRED_MESSAGE };

  if (ticketOutcome.kind === "ticket") {
    const { ticket } = ticketOutcome;
    // A rejected file arrives as a normal answer carrying the actual reason.
    if (!ticket.ok) return { ok: false, error: ticket.error };

    const worked = await uploadDirect({ uploadUrl: ticket.uploadUrl, file: prepared, mimeType, onProgress, trail });
    if (worked) {
      onProgress?.(1);
      return {
        ok: true,
        publicUrl: ticket.publicUrl,
        objectKey: ticket.objectKey,
        mimeType,
        fileSize: prepared.size,
        filename: prepared.name,
      };
    }
  }

  const result = await uploadViaServer({ file: prepared, kind, mimeType, category, onProgress, trail });
  if (!result.ok) {
    reportFailure({
      kind,
      category,
      mimeType,
      fileSize: prepared.size,
      originalSize: file.size,
      finalError: result.error,
      trail,
    });
  }
  return result;
}
