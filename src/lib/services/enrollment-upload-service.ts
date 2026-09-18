import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  generateObjectKey,
  getPresignedUploadUrl,
  buildPublicUrl,
  getObjectMetadata,
  readObjectHeadBytes,
  deleteObject,
  isR2Configured,
  uploadBuffer,
} from "@/lib/storage/r2";
import { validateUploadRequest, bytesMatchDeclaredType } from "@/lib/storage/validation";
import { MAX_PASSPORT_PICTURE_BYTES, MAX_MEDICAL_REPORT_BYTES } from "@/lib/validations/membership";
import { MEDICAL_REPORT_MIME_TYPES } from "@/lib/client/file-accept";
import { MAX_PATRON_DOCUMENT_BYTES, PATRON_DOCUMENT_MIME_TYPES } from "@/lib/patron-portal-options";
import { BARRIER_EVIDENCE_MIME_TYPES, MAX_BARRIER_EVIDENCE_BYTES } from "@/lib/portal-options";

/**
 * Direct-to-R2 uploads for the PUBLIC enrollment form.
 *
 * Why this exists: Vercel rejects a Function request body over 4.5MB before
 * the function runs (413 FUNCTION_PAYLOAD_TOO_LARGE), so file bytes simply
 * cannot travel through a Server Action at the sizes this form accepts. The
 * bytes have to go straight from the browser to R2.
 *
 * That means handing a write URL to someone who has not authenticated —
 * which is exactly what lib/storage/r2.ts previously reserved for admins.
 * The trust that used to come from "you are a logged-in admin" is replaced
 * here by four narrower constraints:
 *
 *   1. The object key is generated server-side and never accepted from the
 *      client, so a caller cannot choose where in the bucket to write.
 *   2. The ticket is HMAC-signed. At submission time we only honour a key we
 *      can prove we issued, so a submission cannot point at an arbitrary
 *      object that already exists in the bucket.
 *   3. The presigned PUT pins Content-Type and expires in minutes.
 *   4. Nothing is trusted until after the fact: on submit we read the stored
 *      object back, check its real size, and sniff its magic bytes. Anything
 *      that doesn't match what was authorised is deleted, not saved.
 *
 * (4) is the important one. It preserves the "never trust the browser's
 * Content-Type" guarantee the server-proxied upload had — without it, moving
 * these uploads direct-to-R2 would be a real security regression rather than
 * a bug fix.
 */

/**
 * "patron-document" is a patron's upload from the Patrons' Portal (a letter
 * for a broadcast, or a document for the governance library). It uses the
 * same signed, verified path; only its own route handlers issue it, and
 * only to a signed-in patron.
 */
export type EnrollmentUploadKind = "passport" | "medical" | "patron-document" | "barrier-evidence";

/** The kinds the public enrollment and further-studies forms may request. */
export const APPLICANT_UPLOAD_KINDS: readonly EnrollmentUploadKind[] = ["passport", "medical"];

const KIND_CONFIG: Record<
  EnrollmentUploadKind,
  {
    category: "image" | "document" | "evidence";
    maxBytes: number;
    label: string;
    /** Narrower than the category allows, where the category is too broad. */
    mimeTypes?: readonly string[];
    wrongTypeMessage?: string;
    /** The bucket folder the object is stored under. */
    prefix: "members" | "library" | "reports";
    /** How to describe a file that fails the byte check. */
    expectedFiles?: string;
  }
> = {
  passport: { category: "image", maxBytes: MAX_PASSPORT_PICTURE_BYTES, label: "passport picture", prefix: "members" },
  // "document" on its own would also let a spreadsheet or a zip through, and
  // on Android the picker no longer filters what can be chosen (see
  // lib/client/file-accept.ts), so the list is enforced here.
  medical: {
    category: "document",
    maxBytes: MAX_MEDICAL_REPORT_BYTES,
    label: "medical report",
    mimeTypes: MEDICAL_REPORT_MIME_TYPES,
    wrongTypeMessage: "Your medical report must be a PDF or Word document, or a JPG or PNG photo of the report.",
    prefix: "members",
  },
  "patron-document": {
    category: "document",
    maxBytes: MAX_PATRON_DOCUMENT_BYTES,
    label: "document",
    mimeTypes: PATRON_DOCUMENT_MIME_TYPES,
    wrongTypeMessage: "Attach a PDF, Word, Excel or PowerPoint file, or a JPG or PNG image.",
    prefix: "library",
    expectedFiles: "a PDF, Office document, JPG or PNG",
  },
  // A photo of the barrier, or a recording describing it. Never served
  // publicly — see barrier-report-service.getReportEvidence for who may
  // read one back.
  "barrier-evidence": {
    category: "evidence",
    maxBytes: MAX_BARRIER_EVIDENCE_BYTES,
    label: "attachment",
    mimeTypes: BARRIER_EVIDENCE_MIME_TYPES,
    wrongTypeMessage: "Attach a photo (JPG or PNG), a voice recording, or a PDF.",
    prefix: "reports",
    expectedFiles: "a photo, a voice recording or a PDF",
  },
};

function expectedFilesFor(kind: EnrollmentUploadKind): string {
  return KIND_CONFIG[kind].expectedFiles ?? "a JPG, PNG or PDF";
}

/** What to call the file in "that doesn't look like a valid …" messages. */
function categoryNoun(category: "image" | "document" | "evidence"): string {
  if (category === "image") return "image";
  if (category === "evidence") return "attachment";
  return "document";
}

function typeProblem(kind: EnrollmentUploadKind, mimeType: string): string | null {
  const config = KIND_CONFIG[kind];
  if (!config.mimeTypes || config.mimeTypes.includes(mimeType)) return null;
  return config.wrongTypeMessage ?? `That file type can't be used for your ${config.label}.`;
}

/**
 * Validates the body of a ticket request from a route handler. The values
 * are only descriptions of the file — every one is checked again, against
 * the real stored bytes, before an application is saved.
 */
export function parseEnrollmentTicketRequest(
  body: unknown,
  allowedKinds: readonly EnrollmentUploadKind[] = APPLICANT_UPLOAD_KINDS,
): {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  fileSize: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const { kind, filename, mimeType, fileSize } = body as Record<string, unknown>;
  if (typeof kind !== "string" || !allowedKinds.includes(kind as EnrollmentUploadKind)) return null;
  if (typeof filename !== "string" || filename.length === 0 || filename.length > 300) return null;
  if (typeof mimeType !== "string" || mimeType.length > 200) return null;
  if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize < 0) return null;
  return { kind: kind as EnrollmentUploadKind, filename, mimeType, fileSize };
}

/**
 * Whether a ticket is one this server signed and that hasn't expired.
 *
 * Cheap (no storage call), so the enrollment action can use it to tell a
 * real applicant from a script before deciding what a bot-check signal
 * means: a script posting the form has no way to produce a signed ticket
 * without actually uploading a file through this flow.
 */
export function isGenuineEnrollmentTicket(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    return decodeToken(token) !== null;
  } catch {
    return false;
  }
}

/** The browser uploads immediately after the file is chosen. */
const PUT_URL_TTL_SECONDS = 300;

/** A person may spend a while finishing the rest of the form before submitting. */
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/** Enough for every signature we check in bytesMatchDeclaredType. */
const SNIFF_BYTES = 16;

export class EnrollmentUploadError extends Error {}

export type EnrollmentUploadTicket =
  | { ok: true; mode: "upload"; uploadUrl: string; token: string }
  /** R2 isn't configured (local development) — the form proceeds without a file,
   *  matching how the server-proxied path already behaved in that environment. */
  | { ok: true; mode: "skip" }
  | { ok: false; error: string };

interface TokenPayload {
  /** Object key we generated. */
  k: string;
  kind: EnrollmentUploadKind;
  /** Content-Type pinned into the presigned PUT. */
  ct: string;
  /** Expiry, epoch ms. */
  exp: number;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — required to sign enrollment upload tickets.");
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

function encodeToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeToken(token: string): TokenPayload | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(body));
  // Length check first: timingSafeEqual throws on a length mismatch.
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (typeof payload.k !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Step 1: validate the declared file and hand back a short-lived signed PUT
 * URL plus a signed ticket. Nothing is stored yet — the ticket is stateless,
 * which is deliberate: an abandoned enrollment leaves no database row.
 */
export async function requestEnrollmentUpload(params: {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<EnrollmentUploadTicket> {
  const { kind, filename, mimeType, fileSize } = params;
  const config = KIND_CONFIG[kind];
  if (!config) return { ok: false, error: "Unknown upload type." };

  if (!isR2Configured()) return { ok: true, mode: "skip" };

  const check = validateUploadRequest({
    filename,
    mimeType,
    fileSize,
    category: config.category,
    maxSizeBytes: config.maxBytes,
  });
  if (!check.ok) return { ok: false, error: check.error };
  const wrongType = typeProblem(kind, mimeType);
  if (wrongType) return { ok: false, error: wrongType };

  const objectKey = generateObjectKey(config.prefix, filename, mimeType);
  const uploadUrl = await getPresignedUploadUrl({
    objectKey,
    contentType: mimeType,
    expiresInSeconds: PUT_URL_TTL_SECONDS,
  });

  return {
    ok: true,
    mode: "upload",
    uploadUrl,
    token: encodeToken({ k: objectKey, kind, ct: mimeType, exp: Date.now() + TOKEN_TTL_MS }),
  };
}

export type EnrollmentStoreResult = { ok: true; token: string } | { ok: false; error: string };

/**
 * Same as step 1, except the bytes arrive here instead of going straight to
 * R2 — the fallback for browsers that can't reach R2 directly.
 *
 * The direct-to-R2 PUT is cross-origin, so it depends on R2's CORS policy
 * naming the page's exact origin. Android in-app browsers (a link opened
 * inside WhatsApp or Facebook, which is how most people on Android open
 * links) report `Origin: null` on cross-origin requests, R2 refuses that
 * with a 403, and the browser blocks the upload before it leaves the phone.
 * For an applicant that means the enrollment form simply will not accept
 * their passport photo, with nothing they can do about it. Routing the
 * bytes through our own server makes the request same-origin, where no
 * CORS check applies at all.
 *
 * All four constraints in the header comment still hold, and two get
 * stronger: the object key is still generated here and never accepted from
 * the caller, the ticket is still HMAC-signed, and because the bytes are in
 * hand the magic-byte sniff happens BEFORE anything is written rather than
 * after. Submission still re-verifies independently via
 * adoptEnrollmentUpload, so this path is not trusted any further than the
 * presigned one.
 */
export async function storeEnrollmentUpload(params: {
  kind: EnrollmentUploadKind;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<EnrollmentStoreResult> {
  const { kind, filename, mimeType, bytes } = params;
  const config = KIND_CONFIG[kind];
  if (!config) return { ok: false, error: "Unknown upload type." };
  if (!isR2Configured()) return { ok: false, error: "File storage isn't available right now." };

  const check = validateUploadRequest({
    filename,
    mimeType,
    fileSize: bytes.byteLength,
    category: config.category,
    maxSizeBytes: config.maxBytes,
  });
  if (!check.ok) return { ok: false, error: check.error };
  const wrongType = typeProblem(kind, mimeType);
  if (wrongType) return { ok: false, error: wrongType };

  // Refuse before writing rather than after: the bytes are already here, so
  // there's no reason to put something in the bucket only to delete it.
  if (!bytesMatchDeclaredType(bytes.subarray(0, SNIFF_BYTES), mimeType)) {
    return {
      ok: false,
      error: `Your ${config.label} doesn't look like a valid ${
        categoryNoun(config.category)
      }. Please attach ${expectedFilesFor(kind)}.`,
    };
  }

  const objectKey = generateObjectKey(config.prefix, filename, mimeType);
  await uploadBuffer({ objectKey, contentType: mimeType, body: bytes });

  return {
    ok: true,
    token: encodeToken({ k: objectKey, kind, ct: mimeType, exp: Date.now() + TOKEN_TTL_MS }),
  };
}

/**
 * Step 2: verify an upload really happened, really matches what we
 * authorised, and really contains the kind of file it claims to.
 *
 * Returns the public URL to store. Throws EnrollmentUploadError with a
 * person-readable message if anything fails — and deletes the offending
 * object, so a rejected upload doesn't linger in the bucket.
 */
export async function adoptEnrollmentUpload(
  kind: EnrollmentUploadKind,
  token: string | null | undefined,
): Promise<string | null> {
  const upload = await inspectUpload(kind, token);
  return upload ? buildPublicUrl(upload.objectKey) : null;
}

export interface AdoptedUpload {
  objectKey: string;
  mimeType: string;
  fileSize: number;
}

/**
 * The same checks as adoptEnrollmentUpload, for a patron's document: returns
 * the stored object's key, type and real size, or throws
 * EnrollmentUploadError. Null only when file storage isn't configured.
 */
export async function adoptPatronDocumentUpload(token: string | null | undefined): Promise<AdoptedUpload | null> {
  return inspectUpload("patron-document", token);
}

/** The same checks for a photo or voice note attached to a barrier report. */
export async function adoptBarrierEvidenceUpload(token: string | null | undefined): Promise<AdoptedUpload | null> {
  return inspectUpload("barrier-evidence", token);
}

async function inspectUpload(kind: EnrollmentUploadKind, token: string | null | undefined): Promise<AdoptedUpload | null> {
  const config = KIND_CONFIG[kind];

  if (!token) {
    // No ticket is only legitimate where uploads were never offered.
    if (!isR2Configured()) return null;
    throw new EnrollmentUploadError(`Please attach your ${config.label} again.`);
  }

  const payload = decodeToken(token);
  if (!payload || payload.kind !== kind) {
    throw new EnrollmentUploadError(
      `Your ${config.label} upload has expired. Please attach the file again.`,
    );
  }

  const metadata = await getObjectMetadata(payload.k);
  if (!metadata) {
    throw new EnrollmentUploadError(
      `We didn't receive your ${config.label}. Please attach the file again.`,
    );
  }

  const reject = async (message: string): Promise<never> => {
    try {
      await deleteObject(payload.k);
    } catch (err) {
      console.error("[enroll-upload] failed to remove rejected object", payload.k, err);
    }
    throw new EnrollmentUploadError(message);
  };

  if (metadata.size === 0) {
    await reject(`Your ${config.label} appears to be empty. Please attach the file again.`);
  }
  if (metadata.size > config.maxBytes) {
    const mb = Math.round(config.maxBytes / (1024 * 1024));
    await reject(`Your ${config.label} is larger than ${mb}MB. Please attach a smaller file.`);
  }

  // The declared type is what we pinned into the presigned PUT, so it can't
  // have been swapped after the fact — but the BYTES still have to back it up.
  const head = await readObjectHeadBytes(payload.k, SNIFF_BYTES);
  if (!head || !bytesMatchDeclaredType(head, payload.ct)) {
    await reject(
      `Your ${config.label} doesn't look like a valid ${
        categoryNoun(config.category)
      }. Please attach ${expectedFilesFor(kind)}.`,
    );
  }

  return { objectKey: payload.k, mimeType: payload.ct, fileSize: metadata.size };
}
