"use client";

export type ReadFileResult = { ok: true; file: File } | { ok: false };

/**
 * Copies a chosen file's bytes into memory straight away and hands back an
 * in-memory File in its place.
 *
 * A File from an `<input type="file">` is only a handle — the browser reads
 * the actual bytes lazily, at the moment something consumes them. On Android
 * that handle usually points through a content provider (Google Photos,
 * Drive, the gallery app) rather than at a plain file, and it can stop being
 * readable between the moment it was picked and the moment the upload sends
 * it: the provider revokes access, a cloud photo is still downloading, or
 * Chrome notices the modification time moved and fails the request with
 * ERR_UPLOAD_FILE_CHANGED. All of those reach a fetch/XHR as a bare network
 * error, indistinguishable from a dropped connection, and every retry of the
 * same handle fails the same way — which is exactly "the upload didn't
 * finish after a few tries".
 *
 * Reading once, up front, turns that into either bytes we hold (and can send
 * as many times as needed) or one clear, immediate failure we can explain.
 *
 * `type` lets the caller supply a resolved MIME type, because some Android
 * providers hand back a File whose own `type` is empty.
 */
export async function readFileIntoMemory(file: File, type?: string): Promise<ReadFileResult> {
  try {
    const buffer = await file.arrayBuffer();
    return {
      ok: true,
      file: new File([buffer], file.name, { type: type || file.type, lastModified: file.lastModified }),
    };
  } catch (err) {
    console.error("[read-file] could not read the chosen file", { name: file.name, size: file.size, type: file.type, err });
    return { ok: false };
  }
}

export const FILE_READ_FAILED_MESSAGE =
  "We couldn't read that file from your device. If it's stored in Google Photos, Drive or another cloud app, save it to your phone first, then choose it again.";
