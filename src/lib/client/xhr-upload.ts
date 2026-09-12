"use client";

export type TransferOutcome =
  | { kind: "response"; status: number; body: string }
  /** The request never completed: offline, dropped mid-way, or refused by
   *  the browser before it was sent (a CORS block looks exactly like this). */
  | { kind: "network-error" }
  /** Nothing moved for `stallTimeoutMs` — a connection that has silently
   *  hung, which on mobile data otherwise leaves a spinner going forever. */
  | { kind: "stalled" };

/**
 * Sends a request body with upload progress, using XMLHttpRequest because
 * fetch() still has no way to report how much of a request body has gone
 * out.
 *
 * Progress matters here for more than looks: on a slow mobile connection a
 * multi-megabyte photo can take a minute, and with nothing but a spinner
 * people assume it has frozen and abandon it or start again.
 *
 * The timeout is a stall timeout, not a total one. A total limit would have
 * to be long enough for the slowest legitimate upload, which makes it useless
 * for spotting a dead connection; resetting the clock whenever bytes move
 * catches a hung request quickly without ever cutting off a slow one.
 */
export function sendWithProgress(params: {
  method: "PUT" | "POST";
  url: string;
  body: Blob | FormData;
  headers?: Record<string, string>;
  stallTimeoutMs: number;
  onProgress?: (fraction: number) => void;
}): Promise<TransferOutcome> {
  const { method, url, body, headers, stallTimeoutMs, onProgress } = params;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stalled = false;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: TransferOutcome) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearTimeout(stallTimer);
      resolve(outcome);
    };

    const armStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, stallTimeoutMs);
    };

    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(name, value);

    xhr.upload.onprogress = (event) => {
      armStallTimer();
      if (onProgress && event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    // Bytes coming back count as the connection being alive too.
    xhr.onprogress = armStallTimer;

    xhr.onload = () => settle({ kind: "response", status: xhr.status, body: xhr.responseText ?? "" });
    xhr.onerror = () => settle({ kind: "network-error" });
    xhr.onabort = () => settle(stalled ? { kind: "stalled" } : { kind: "network-error" });
    xhr.ontimeout = () => settle({ kind: "stalled" });

    armStallTimer();
    try {
      xhr.send(body);
    } catch {
      settle({ kind: "network-error" });
    }
  });
}

export function describeTransfer(outcome: TransferOutcome): string {
  if (outcome.kind === "response") return `HTTP ${outcome.status}`;
  return outcome.kind;
}
