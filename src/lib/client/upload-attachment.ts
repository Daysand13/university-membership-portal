import { downscaleImage } from "@/lib/client/downscale-image";
import { readFileIntoMemory, FILE_READ_FAILED_MESSAGE } from "@/lib/client/read-file";
import { sendWithProgress, describeTransfer } from "@/lib/client/xhr-upload";
import type { EnrollmentUploadKind, EnrollmentUploadTicket } from "@/lib/services/enrollment-upload-service";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Some Android file providers hand back a File with an empty `type` (or a
 * generic application/octet-stream). Falling back to the extension keeps
 * those selections usable; the server verifies the actual bytes either way,
 * so a wrong guess is caught rather than trusted.
 */
export function resolveMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? file.type;
}

export type UploadOutcome =
  | { status: "ready"; bytes: number; token: string; filename: string; file: File }
  /** R2 isn't configured (local development) — carry on without storing anything. */
  | { status: "skipped"; bytes: number; filename: string; file: File }
  | { status: "error"; message: string };

/**
 * Uploads an applicant's attachment — the public enrollment form's and the
 * alumni further-studies form's — and returns the signed ticket naming the
 * stored object. The form submission carries only that ticket: Vercel
 * rejects a request body over 4.5MB before any of our code runs, and these
 * files can exceed that on their own.
 *
 * Built the same way as the admin upload (lib/client/admin-upload.ts),
 * because applicants hit the same failures, on the same phones:
 *
 *   1. The ticket comes from a route handler, not a Server Action, so a form
 *      left open across a deployment still works (a Server Action's ID
 *      changes with every deploy and failed every attempt until a reload).
 *   2. The file is read into memory first — Android file handles can stop
 *      being readable mid-upload (lib/client/read-file.ts).
 *   3. Photos are re-encoded to a size a weak connection can finish.
 *   4. Every transfer reports progress and gives up on a stalled connection
 *      instead of spinning forever (lib/client/xhr-upload.ts), with retries.
 *   5. If storage can't be reached directly — including an in-app browser
 *      whose `Origin: null` R2's CORS policy refuses — the bytes go through
 *      our own server instead.
 *   6. A failure that survives all of that is reported
 *      (api/enrollment/upload/diagnostics) so there's evidence to act on.
 */

const TICKET_ATTEMPTS = 3;
const DIRECT_ATTEMPTS = 2;
const FALLBACK_ATTEMPTS = 2;
const RETRY_DELAY_MS = [800, 2000];
const STALL_TIMEOUT_MS = 45_000;

/**
 * Ceiling for the same-origin fallback: Vercel refuses a request body over
 * 4.5MB before our code runs, so this leaves room for multipart overhead.
 */
const FALLBACK_MAX_BYTES = 4 * 1024 * 1024;
const FALLBACK_IMAGE_TARGET_BYTES = Math.floor(3.5 * 1024 * 1024);

const OFFLINE_MESSAGE = "You're offline. Reconnect to the internet, then attach the file again.";
const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again, then attach the file again.";
const GAVE_UP_MESSAGE =
  "Your file couldn't be uploaded after several tries. Please check your connection and attach it again — switching between Wi-Fi and mobile data can help.";
const TOO_LARGE_FOR_FALLBACK_MESSAGE =
  "Your file couldn't be uploaded over this connection, and it's too large to send another way. Please try a file under 4MB, or try again on a different network.";

type TrailEntry = { stage: "read" | "ticket" | "direct" | "fallback"; attempt: number; outcome: string };

type TicketOutcome =
  | { kind: "ticket"; ticket: EnrollmentUploadTicket }
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

/** Fire-and-forget: a failed report must never become a second error. */
function reportFailure(details: {
  kind: EnrollmentUploadKind;
  mimeType?: string;
  fileSize?: number;
  originalSize?: number;
  finalError: string;
  trail: TrailEntry[];
}) {
  try {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    void fetch("/api/enrollment/upload/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...details,
        online: navigator.onLine,
        connection: connection?.effectiveType ?? null,
        userAgent: navigator.userAgent,
        page: location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // The person already has their error message.
  }
}

async function requestTicket(
  ticketUrl: string,
  input: { kind: EnrollmentUploadKind; filename: string; mimeType: string; fileSize: number },
  trail: TrailEntry[],
): Promise<TicketOutcome> {
  for (let attempt = 1; attempt <= TICKET_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(ticketUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      if (response.status === 401) return { kind: "session-expired" };

      const json = (await response.json().catch(() => null)) as EnrollmentUploadTicket | null;
      const answered = json !== null && typeof json.ok === "boolean";
      // A refusal with a reason (wrong file type, too large, rate limited)
      // is an answer, not a failure to retry.
      if (answered && (response.ok || (response.status >= 400 && response.status < 500))) {
        return { kind: "ticket", ticket: json };
      }

      trail.push({ stage: "ticket", attempt, outcome: `HTTP ${response.status}` });
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

  // A presigned URL can be PUT to more than once before it expires, so a
  // retry needs no new ticket.
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
    console.error(`[upload-attachment] direct upload failed (attempt ${attempt}/${DIRECT_ATTEMPTS})`, outcome);

    // Storage answered and refused (an expired or mismatched signature): the
    // same request will be refused again, but the server path signs its own.
    if (outcome.kind === "response") return false;
    if (attempt < DIRECT_ATTEMPTS) await sleep(RETRY_DELAY_MS[attempt - 1]);
  }
  return false;
}

/**
 * Sends the file to our own server, which stores it and returns the same
 * signed ticket. Same-origin, so no CORS check applies — this is what rescues
 * an in-app browser R2 refuses. Only the fallback, because everything sent
 * this way counts against Vercel's request body cap.
 */
async function uploadViaServer(params: {
  kind: EnrollmentUploadKind;
  file: File;
  mimeType: string;
  onProgress?: (fraction: number) => void;
  trail: TrailEntry[];
}): Promise<UploadOutcome> {
  const { kind, onProgress, trail } = params;
  let { file, mimeType } = params;

  if (file.size > FALLBACK_MAX_BYTES && mimeType.startsWith("image/")) {
    file = await downscaleImage(file, { targetBytes: FALLBACK_IMAGE_TARGET_BYTES });
    mimeType = resolveMimeType(file);
  }
  if (file.size > FALLBACK_MAX_BYTES) return { status: "error", message: TOO_LARGE_FOR_FALLBACK_MESSAGE };

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  body.append("mimeType", mimeType);

  type FallbackResponse = { ok: true; token: string; bytes: number; filename: string } | { ok: false; error: string };

  for (let attempt = 1; attempt <= FALLBACK_ATTEMPTS; attempt++) {
    onProgress?.(0);
    const outcome = await sendWithProgress({
      method: "POST",
      url: "/api/enrollment/upload",
      body,
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onProgress,
    });

    if (outcome.kind === "response") {
      const json = parseJson<FallbackResponse>(outcome.body);
      if (outcome.status >= 200 && outcome.status < 300 && json?.ok) {
        onProgress?.(1);
        return { status: "ready", bytes: json.bytes, token: json.token, filename: json.filename, file };
      }
      trail.push({ stage: "fallback", attempt, outcome: describeTransfer(outcome) });
      if (outcome.status === 413) return { status: "error", message: TOO_LARGE_FOR_FALLBACK_MESSAGE };
      // A refusal with a reason is the file being refused — say why, don't retry.
      if (outcome.status < 500 && json && !json.ok) return { status: "error", message: json.error };
    } else {
      trail.push({ stage: "fallback", attempt, outcome: describeTransfer(outcome) });
    }

    console.error(`[upload-attachment] same-origin fallback failed (attempt ${attempt}/${FALLBACK_ATTEMPTS})`, outcome);
    if (attempt < FALLBACK_ATTEMPTS) await sleep(RETRY_DELAY_MS[attempt - 1]);
  }

  return { status: "error", message: isOffline() ? OFFLINE_MESSAGE : GAVE_UP_MESSAGE };
}

export async function prepareAndUpload(params: {
  kind: EnrollmentUploadKind;
  file: File;
  /** Photos are re-encoded down to about this size first. */
  targetBytes: number;
  /** The route that issues tickets for this form's caller (applicant or alumnus). */
  ticketUrl: string;
  /** 0–1 for whichever transfer is currently running. */
  onProgress?: (fraction: number) => void;
}): Promise<UploadOutcome> {
  const { kind, file, targetBytes, ticketUrl, onProgress } = params;
  const trail: TrailEntry[] = [];

  if (isOffline()) return { status: "error", message: OFFLINE_MESSAGE };

  const read = await readFileIntoMemory(file, resolveMimeType(file));
  if (!read.ok) {
    trail.push({ stage: "read", attempt: 1, outcome: "unreadable" });
    reportFailure({ kind, mimeType: file.type, originalSize: file.size, finalError: FILE_READ_FAILED_MESSAGE, trail });
    return { status: "error", message: FILE_READ_FAILED_MESSAGE };
  }
  if (read.file.size === 0) return { status: "error", message: "That file is empty. Please choose a different file." };

  // A PDF or Word document uploads untouched; only a photo is re-encoded.
  const prepared = await downscaleImage(read.file, { targetBytes });
  const mimeType = resolveMimeType(prepared);

  const ticketOutcome = await requestTicket(
    ticketUrl,
    { kind, filename: prepared.name, mimeType, fileSize: prepared.size },
    trail,
  );
  if (ticketOutcome.kind === "session-expired") return { status: "error", message: SESSION_EXPIRED_MESSAGE };

  if (ticketOutcome.kind === "ticket") {
    const { ticket } = ticketOutcome;
    if (!ticket.ok) return { status: "error", message: ticket.error };
    if (ticket.mode === "skip") return { status: "skipped", bytes: prepared.size, filename: prepared.name, file: prepared };

    if (await uploadDirect({ uploadUrl: ticket.uploadUrl, file: prepared, mimeType, onProgress, trail })) {
      onProgress?.(1);
      return { status: "ready", bytes: prepared.size, token: ticket.token, filename: prepared.name, file: prepared };
    }
  }

  const result = await uploadViaServer({ kind, file: prepared, mimeType, onProgress, trail });
  if (result.status === "error") {
    reportFailure({ kind, mimeType, fileSize: prepared.size, originalSize: file.size, finalError: result.message, trail });
  }
  return result;
}
