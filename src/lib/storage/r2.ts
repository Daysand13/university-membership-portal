import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { extensionForMimeType, sanitizeFilenameStem } from "./validation";

/**
 * Cloudflare R2 is the sole object-storage provider for this project (R2 is
 * S3-compatible, so we reuse the AWS SDK v3 clients configured against R2's
 * endpoint). Nothing here is AWS-specific; swapping providers later means
 * replacing this one file, per the storage-abstraction requirement.
 */

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment.",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set.");
  return bucket;
}

/**
 * Object-key prefixes, matching the logical folders called out in the spec.
 * Keeping these as a typed union prevents typos from scattering objects
 * outside the expected layout.
 */
export const R2_PREFIXES = {
  site: "site",
  news: "news",
  events: "events",
  members: "members",
  library: "library",
  elections: "elections",
  donations: "donations",
  media: "media",
} as const;

export type R2Prefix = (typeof R2_PREFIXES)[keyof typeof R2_PREFIXES];

export function generateObjectKey(
  prefix: R2Prefix,
  originalFilename: string,
  mimeType: string,
): string {
  const ext = extensionForMimeType(mimeType, originalFilename);
  const stem = sanitizeFilenameStem(originalFilename);
  const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `${prefix}/${unique}-${stem}${ext ? `.${ext}` : ""}`;
}

export function buildPublicUrl(objectKey: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_URL is not set — configure a public bucket domain or custom domain.");
  }
  return `${base.replace(/\/$/, "")}/${objectKey}`;
}

/** Inverse of buildPublicUrl, used for best-effort cleanup when an entity's
 * image is replaced or deleted. Returns null for URLs we don't recognize
 * (e.g. a pre-existing external URL an admin pasted in manually). */
export function extractObjectKeyFromPublicUrl(url: string | null | undefined): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!url || !base) return null;
  const normalizedBase = base.replace(/\/$/, "");
  if (!url.startsWith(`${normalizedBase}/`)) return null;
  return url.slice(normalizedBase.length + 1);
}

/**
 * Step 1 of the direct-to-R2 upload flow: the backend hands the browser a
 * short-lived signed PUT URL. The browser then uploads the file bytes
 * straight to R2 (see UPLOAD ARCHITECTURE in the project README) — file
 * bytes never pass through the Next.js server for admin-side uploads.
 */
export async function getPresignedUploadUrl(params: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { objectKey, contentType, expiresInSeconds = 300 } = params;
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

/**
 * Short-lived signed download URL for private objects (e.g. a library
 * document an admin has marked members-only).
 */
export async function getPresignedDownloadUrl(
  objectKey: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: objectKey });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(objectKey: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: objectKey }));
}

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Server-side proxy upload, used only for the small number of paths where
 * the uploader is unauthenticated (the public enrollment form's profile
 * picture). Direct-to-R2 presigned uploads are reserved for authenticated
 * admin uploads, where we trust the caller enough to hand out a write URL.
 */
export async function uploadBuffer(params: {
  objectKey: string;
  contentType: string;
  body: Buffer;
}): Promise<void> {
  const { objectKey, contentType, body } = params;
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export function isR2Configured(): boolean {
  return Boolean(
    (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT) &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}
