import { API_URL } from "../config";
import type { ApiFailure } from "./types";

/**
 * Every request the app makes.
 *
 * Three things it handles that a bare fetch does not:
 *
 *  - **A stale access token.** They last fifteen minutes, so this is the
 *    normal case, not an error. One refresh, one retry, and the screen
 *    that asked never knows it happened.
 *  - **Many requests going stale at once.** A dashboard opening four lists
 *    would otherwise refresh four times over, and the server treats a
 *    re-used refresh token as a copied one and cuts the device off — so
 *    the app would sign itself out for doing the obvious thing. The
 *    refresh is single-flight: the first caller does it, the rest wait.
 *  - **The network being what it is.** A phone in Winneba drops
 *    connection mid-request often enough that "failed" has to mean
 *    something a person can act on.
 */

export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;
  /** True when it is worth trying again — as opposed to being refused. */
  readonly retryable: boolean;

  constructor(message: string, status: number, code?: string, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export class OfflineError extends ApiError {
  constructor() {
    super("You appear to be offline. Check your connection and try again.", 0, "offline", true);
    this.name = "OfflineError";
  }
}

export interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
  /** Saves a fresh pair after a refresh. */
  onRefreshed: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  /** Called when the session is over for good and the person must sign in. */
  onSignedOut: (reason: string) => Promise<void>;
}

let tokens: TokenStore = {
  accessToken: null,
  refreshToken: null,
  onRefreshed: async () => {},
  onSignedOut: async () => {},
};

export function configureTokens(store: TokenStore) {
  tokens = store;
}

export function setAccessToken(accessToken: string | null, refreshToken: string | null) {
  tokens.accessToken = accessToken;
  tokens.refreshToken = refreshToken;
}

/** The refresh in flight, if there is one. See the note above. */
let refreshing: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const refreshToken = tokens.refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await response.json()) as
        | { ok: true; accessToken: string; refreshToken: string }
        | ApiFailure;

      if (!response.ok || !body.ok) {
        await tokens.onSignedOut("Your session has ended. Please sign in again.");
        return false;
      }

      tokens.accessToken = body.accessToken;
      tokens.refreshToken = body.refreshToken;
      await tokens.onRefreshed({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } catch {
      // The network, not the session. Leave the tokens alone so the next
      // attempt can use them — signing somebody out over a dropped
      // connection would be the worse mistake by far.
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Endpoints that work signed out — news, events, the update check. */
  open?: boolean;
  signal?: AbortSignal;
}

async function send<T>(path: string, options: RequestOptions, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (!options.open && tokens.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new OfflineError();
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A response that isn't JSON is the server being unwell, or something
    // in between us and it — a captive portal, most likely.
    throw new ApiError("ASSN couldn't be reached properly. Please try again in a moment.", response.status, undefined, true);
  }

  if (response.ok && (body as { ok?: boolean })?.ok !== false) return body as T;

  const failure = body as ApiFailure;

  // The one case worth retrying silently: a token that simply aged out.
  if (response.status === 401 && failure.code === "session_expired" && !isRetry && !options.open) {
    const refreshed = await refreshOnce();
    if (refreshed) return send<T>(path, options, true);
  }

  if (response.status === 401 && !options.open) {
    // Revoked, or an account no longer active. There is nothing the app
    // can do but ask them to sign in again.
    if (failure.code !== "session_expired") {
      await tokens.onSignedOut(failure.error ?? "Please sign in again.");
    }
  }

  throw new ApiError(
    failure.error ?? "Something went wrong. Please try again.",
    response.status,
    failure.code,
    response.status >= 500 || response.status === 429,
  );
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    send<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    send<T>(path, { ...options, method: "POST", body: body ?? {} }),
};

/** For the tests, which need each case to start from nothing in flight. */
export function resetClientForTests() {
  refreshing = null;
  tokens = {
    accessToken: null,
    refreshToken: null,
    onRefreshed: async () => {},
    onSignedOut: async () => {},
  };
}
