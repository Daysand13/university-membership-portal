import "server-only";

// Prisma error codes / messages that indicate a transient connection
// problem (a brief network blip, the database waking up from idle, etc.)
// rather than a real data problem — worth one quick retry before giving up.
// Retrying a genuine data error (like a unique-constraint violation) would
// just fail the same way twice, so this list stays narrow and specific.
const RETRYABLE_PATTERNS = [
  "P1001", // Can't reach database server
  "P1002", // Database server was reached but timed out
  "P1017", // Server has closed the connection
  "ECONNRESET",
  "Connection terminated",
  "connection reset",
];

function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? `${err.message} ${(err as { code?: string }).code ?? ""}` : String(err);
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a database operation once, after a short delay, if it fails with
 * what looks like a transient connection error. Used on the handful of
 * public, unauthenticated write paths (enrollment, contact form) where a
 * brief hiccup shouldn't cost someone their submission and force them to
 * start over.
 */
export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRetryable(err)) throw err;
    console.warn("[db] transient error, retrying once:", err instanceof Error ? err.message : err);
    await sleep(300);
    return fn();
  }
}
