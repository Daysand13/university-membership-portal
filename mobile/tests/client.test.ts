import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, configureTokens, resetClientForTests, setAccessToken } from "../src/api/client";

/**
 * What the app does when its token ages out.
 *
 * This is the piece most able to lock people out of their own account: the
 * server treats a re-used refresh token as a copied one and revokes the
 * device, so an app that refreshes twice over signs itself out for doing
 * the obvious thing. These tests exist because that failure would look
 * like "the app randomly logs me out" and be near-impossible to diagnose
 * from a report.
 */

type Reply = { status: number; body: unknown };

let replies: Reply[] = [];
let calls: { url: string; init: RequestInit | undefined }[] = [];

function queue(...next: Reply[]) {
  replies = next;
}

beforeEach(() => {
  resetClientForTests();
  calls = [];
  replies = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const reply = replies.shift() ?? { status: 500, body: { ok: false, error: "no reply queued" } };
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: async () => reply.body,
    } as Response;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ok = (body: Record<string, unknown>) => ({ status: 200, body: { ok: true, ...body } });
const expired = { status: 401, body: { ok: false, error: "Your session has expired.", code: "session_expired" } };

describe("an access token that has aged out", () => {
  it("refreshes once and retries, and the screen never knows", async () => {
    const onRefreshed = vi.fn(async () => {});
    configureTokens({
      accessToken: "old",
      refreshToken: "refresh-1",
      onRefreshed,
      onSignedOut: async () => {},
    });

    queue(expired, ok({ accessToken: "new", refreshToken: "refresh-2" }), ok({ news: [] }));

    const result = await api.get<{ news: unknown[] }>("/news");
    expect(result.news).toEqual([]);

    expect(calls).toHaveLength(3);
    expect(calls[1].url).toContain("/auth/refresh");
    // The retry carries the new token, not the stale one.
    expect((calls[2].init?.headers as Record<string, string>).authorization).toBe("Bearer new");
    expect(onRefreshed).toHaveBeenCalledWith({ accessToken: "new", refreshToken: "refresh-2" });
  });

  it("refreshes ONCE for several requests that go stale together", async () => {
    // A dashboard opening four lists at once. Four refreshes would spend
    // the token four times, and the server would revoke the device —
    // signing the member out for opening a screen.
    configureTokens({
      accessToken: "old",
      refreshToken: "refresh-1",
      onRefreshed: async () => {},
      onSignedOut: async () => {},
    });

    queue(
      expired,
      expired,
      expired,
      ok({ accessToken: "new", refreshToken: "refresh-2" }),
      ok({ a: 1 }),
      ok({ b: 2 }),
      ok({ c: 3 }),
    );

    await Promise.all([api.get("/one"), api.get("/two"), api.get("/three")]);

    const refreshes = calls.filter((call) => call.url.includes("/auth/refresh"));
    expect(refreshes).toHaveLength(1);
  });

  it("gives up and signs out when the refresh itself is refused", async () => {
    const onSignedOut = vi.fn(async () => {});
    configureTokens({
      accessToken: "old",
      refreshToken: "stale",
      onRefreshed: async () => {},
      onSignedOut,
    });

    queue(expired, { status: 401, body: { ok: false, error: "Please sign in again.", code: "sign_in_again" } });

    await expect(api.get("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it("does NOT sign anybody out because the network dropped", async () => {
    // The difference that matters: a refused session is final, a dropped
    // connection is not. Signing somebody out over a tunnel would be the
    // worse mistake by far.
    const onSignedOut = vi.fn(async () => {});
    configureTokens({
      accessToken: "old",
      refreshToken: "refresh-1",
      onRefreshed: async () => {},
      onSignedOut,
    });

    let call = 0;
    vi.stubGlobal("fetch", async () => {
      call += 1;
      if (call === 1) {
        return { ok: false, status: 401, json: async () => expired.body } as Response;
      }
      throw new TypeError("Network request failed");
    });

    await expect(api.get("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onSignedOut).not.toHaveBeenCalled();
  });
});

describe("what the app is told when something goes wrong", () => {
  it("passes the server's own wording through, because it was written for a member", async () => {
    setAccessToken("token", "refresh");
    queue({ status: 403, body: { ok: false, error: "This isn't available to your account.", code: "wrong_audience" } });

    await expect(api.get("/dues")).rejects.toMatchObject({
      message: "This isn't available to your account.",
      code: "wrong_audience",
    });
  });

  it("says something a person can act on when the server sends nonsense", async () => {
    setAccessToken("token", "refresh");
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    }) as unknown as Response);

    // A captive portal on campus wifi, most likely — an HTML login page
    // where JSON was expected.
    await expect(api.get("/news")).rejects.toMatchObject({ retryable: true });
  });

  it("marks a server error and a rate limit as worth retrying, and a refusal as not", async () => {
    setAccessToken("token", "refresh");

    queue({ status: 500, body: { ok: false, error: "Something went wrong." } });
    await expect(api.get("/news")).rejects.toMatchObject({ retryable: true });

    queue({ status: 429, body: { ok: false, error: "Too many attempts.", code: "rate_limited" } });
    await expect(api.get("/news")).rejects.toMatchObject({ retryable: true });

    queue({ status: 404, body: { ok: false, error: "We couldn't find that article." } });
    await expect(api.get("/news/nope")).rejects.toMatchObject({ retryable: false });
  });

  it("sends no token to the endpoints that work signed out", async () => {
    setAccessToken("token", "refresh");
    queue(ok({ news: [] }));

    await api.get("/news", { open: true });
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBeUndefined();
  });
});
