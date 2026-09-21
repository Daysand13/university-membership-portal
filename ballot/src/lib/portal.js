"use strict";

/**
 * The line back to the association's portal.
 *
 * Every call carries the terminal's code and key, which live in the
 * desktop process and never reach the page a voter can see. The only
 * distinction that matters to everything above this file is between "the
 * portal said no" and "the portal could not be reached" — the first is an
 * answer to show somebody, the second is a reason to queue and carry on.
 */

class OfflineError extends Error {
  constructor(cause) {
    super("The portal could not be reached.");
    this.name = "OfflineError";
    this.cause = cause;
  }
}

function createPortalClient({ baseUrl, stationCode, stationKey, fetchImpl = globalThis.fetch, timeoutMs = 12000 }) {
  const root = String(baseUrl || "").replace(/\/+$/, "");

  async function call(pathname, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(`${root}${pathname}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-station-code": stationCode,
          "x-station-key": stationKey,
          ...(options.headers || {}),
        },
      });
    } catch (err) {
      throw new OfflineError(err);
    } finally {
      clearTimeout(timer);
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.status === 401) {
      const error = new Error(body?.error || "This terminal is not registered, or its key has changed.");
      error.name = "StationRejectedError";
      throw error;
    }

    return { status: response.status, body };
  }

  return {
    async getSchedule() {
      const { body } = await call("/api/v1/elections/schedule");
      return body;
    },

    async getBallotPaper() {
      const { body } = await call("/api/v1/elections/candidates");
      return body;
    },

    async verify(indexNumber) {
      const { body } = await call("/api/v1/members/verify", {
        method: "POST",
        body: JSON.stringify({ indexNumber }),
      });
      return body;
    },

    /**
     * Hands over one paper. A 422 is the portal refusing this particular
     * ballot — an expired slip, a mark against somebody not standing —
     * which is final, so the caller stops retrying it.
     */
    async castVote({ token, clientRef, choices }) {
      const { status, body } = await call("/api/v1/elections/votes", {
        method: "POST",
        body: JSON.stringify({ token, clientRef, choices }),
      });
      // The body has a `status` of its own — RECORDED, ALREADY_VOTED — so
      // the HTTP one is named apart from it rather than overwritten.
      return { httpStatus: status, ...(body || {}) };
    },
  };
}

module.exports = { createPortalClient, OfflineError };
