import "server-only";
import type { ActionState } from "./types";

/**
 * Next.js implements redirect() and notFound() by throwing a special error
 * that the framework itself catches. Any catch-all error handling must let
 * those pass through untouched, or navigation silently breaks.
 */
function isFrameworkControlFlow(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("digest" in err)) return false;
  const digest = String((err as { digest?: unknown }).digest);
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}

/**
 * Auth guards (requireAdminUser, requireMember, requireAlumni) throw when
 * the person isn't allowed through. That's a real, expected outcome — not
 * a bug — and it should surface as a clear message rather than being
 * swallowed into a generic "something went wrong".
 */
function isPermissionError(err: unknown): boolean {
  return err instanceof Error && /permission|not authorized|unauthorized/i.test(err.message);
}

const GENERIC_MESSAGE = "Something went wrong. Please try again — if it keeps happening, let us know.";

/**
 * Wraps a form action (one returning ActionState) so that ANY unexpected
 * error becomes a friendly inline message on the form instead of Next.js's
 * raw "a server error occurred" page.
 *
 * This exists because a single unguarded database call in any one action
 * is enough to produce that error page, and there are dozens of actions —
 * relying on every one of them (including ones added later) to remember
 * its own try/catch is exactly how this problem keeps coming back. Wrapping
 * at the boundary makes it structural: an action physically cannot leak an
 * unhandled error, whether or not its author remembered to think about it.
 *
 * Deliberately does NOT swallow redirect/notFound (those are how Next.js
 * implements navigation) or permission errors (those carry a meaningful
 * message the person should actually see).
 */
export function withActionErrorHandling<TArgs extends unknown[]>(
  label: string,
  fn: (...args: TArgs) => Promise<ActionState>,
): (...args: TArgs) => Promise<ActionState> {
  return async (...args: TArgs): Promise<ActionState> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isFrameworkControlFlow(err)) throw err;
      if (isPermissionError(err)) {
        return { error: (err as Error).message };
      }
      console.error(`[action:${label}]`, err);
      return { error: GENERIC_MESSAGE };
    }
  };
}

/**
 * Same idea for the "fire and forget" actions that return void (delete
 * buttons, status toggles, mark-as-read). These have nowhere to put an
 * error message, so the goal here is narrower but still important: log
 * properly, and re-throw so the surrounding error boundary shows the
 * friendly error page rather than the browser's raw one. Without this,
 * failures in these actions were previously invisible in logs.
 */
export function withVoidActionErrorHandling<TArgs extends unknown[]>(
  label: string,
  fn: (...args: TArgs) => Promise<void>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs): Promise<void> => {
    try {
      await fn(...args);
    } catch (err) {
      if (isFrameworkControlFlow(err)) throw err;
      console.error(`[action:${label}]`, err);
      throw err;
    }
  };
}

/**
 * For actions that return their own custom shape (an upload ticket, a
 * signed download URL) rather than ActionState. There's no generic
 * "friendly message" that fits those return types, so the value here is
 * consistent logging — the caller still gets the real error, and the
 * surrounding error boundary renders the friendly page.
 */
export function withTypedActionErrorHandling<TArgs extends unknown[], TResult>(
  label: string,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isFrameworkControlFlow(err)) throw err;
      console.error(`[action:${label}]`, err);
      throw err;
    }
  };
}
