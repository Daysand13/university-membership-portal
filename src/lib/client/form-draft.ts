"use client";

/**
 * Draft persistence for the long public application forms.
 *
 * Why this exists: opening a file picker on a phone hands the foreground to
 * another app — the camera, Files, Drive, a PDF viewer. On a device that is
 * short on memory the browser discards the page while that app is in front,
 * and reloads it from scratch when the person comes back. Everything the
 * form knew lived only in React state, so the reload silently emptied it:
 * the attachment someone had already uploaded stopped showing as attached,
 * even though the file itself was safely in storage the whole time. That is
 * the "my passport picture disappeared after I picked my medical report"
 * report, and it looks device-specific because whether a page gets discarded
 * depends on the device's memory pressure.
 *
 * sessionStorage rather than localStorage on purpose. It survives exactly
 * the case that matters (the tab being discarded and restored, which keeps
 * the tab's session), and it is gone when the tab closes — which matters on
 * the shared campus machines these forms get filled in on, since a draft
 * holds a name, index number, phone number and address.
 *
 * Every entry point swallows its own errors: storage throws outright in
 * Safari private mode and can be disabled entirely by policy, and a form
 * that cannot save a draft must still work normally.
 */

/**
 * Matches the upload ticket lifetime in enrollment-upload-service. A draft
 * older than this would restore attachment tickets the server will refuse,
 * which is a worse experience than starting the attachments over.
 */
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

interface StoredDraft<T> {
  savedAt: number;
  data: T;
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T> | null;
    if (!parsed || typeof parsed.savedAt !== "number" || !parsed.data) return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T): void {
  try {
    const payload: StoredDraft<T> = { savedAt: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage full, disabled, or private mode — the form still works, it
    // just won't survive the page being discarded.
  }
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to do — a leftover draft expires on its own.
  }
}
