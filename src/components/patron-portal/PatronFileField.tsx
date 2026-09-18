"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { FileCheck2, FileUp, Loader2, X } from "lucide-react";
import { prepareAndUpload } from "@/lib/client/upload-attachment";
import { isAndroidDevice, patronDocumentAccept } from "@/lib/client/file-accept";
import { formatFileSize } from "@/lib/patron-portal-options";
import { FieldError } from "@/components/ui/Common";

const noSubscription = () => () => {};

/**
 * A patron's document upload. The file goes to storage as soon as it's
 * chosen (with progress, retries and a fallback route — see
 * lib/client/upload-attachment), and the form only carries the signed
 * ticket naming it, as `${name}Token`, plus its name as `${name}Name`.
 */
export function PatronFileField({
  name,
  label,
  hint,
  required = false,
  errors,
  resetKey,
  // Executives attach files to their own broadcasts with the same field, but
  // they hold an admin session rather than a patron one, so the routes that
  // issue the signed ticket differ. Everything after the ticket is identical.
  ticketUrl = "/api/patrons/upload/ticket",
  fallbackUrl = "/api/patrons/upload",
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  errors?: string[];
  /** Changing this clears the field. */
  resetKey?: number;
  ticketUrl?: string;
  fallbackUrl?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // The picker rules differ on Android (see lib/client/file-accept.ts).
  const android = useSyncExternalStore(
    noSubscription,
    () => isAndroidDevice(navigator),
    () => false,
  );
  const [file, setFile] = useState<{ filename: string; bytes: number; token: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lastReset, setLastReset] = useState(resetKey);
  if (resetKey !== lastReset) {
    setLastReset(resetKey);
    setFile(null);
    setError(null);
  }

  async function handleFile(selected: File) {
    setError(null);
    setFile(null);
    setProgress(0);
    const outcome = await prepareAndUpload({
      kind: "patron-document",
      file: selected,
      targetBytes: Math.floor(1.5 * 1024 * 1024),
      ticketUrl,
      fallbackUrl,
      onProgress: setProgress,
    });
    setProgress(null);
    if (outcome.status === "error") {
      setError(outcome.message);
    } else if (outcome.status === "skipped") {
      setError("File storage isn't available right now, so this file can't be attached.");
    } else {
      setFile({ filename: outcome.filename, bytes: outcome.bytes, token: outcome.token });
    }
  }

  const busy = progress !== null;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-primary-950 mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-slate mb-2">{hint}</p>}

      {file && (
        <>
          <input type="hidden" name={`${name}Token`} value={file.token} />
          <input type="hidden" name={`${name}Name`} value={file.filename} />
        </>
      )}

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck2 size={18} aria-hidden="true" className="text-success shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{file.filename}</p>
              <p className="text-xs text-slate">{formatFileSize(file.bytes)} · attached</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label={`Remove ${file.filename}`}
            className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate hover:text-danger shrink-0"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line bg-surface-muted py-6 text-slate hover:text-primary-700 disabled:cursor-wait"
        >
          {busy ? <Loader2 size={22} aria-hidden="true" className="animate-spin" /> : <FileUp size={22} aria-hidden="true" />}
          <span className="text-sm font-medium" aria-live="polite">
            {busy ? (percent > 0 ? `Uploading… ${percent}%` : "Preparing…") : "Choose a file"}
          </span>
          <span className="text-xs">PDF, Word, Excel, PowerPoint, JPG or PNG · up to 20 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={patronDocumentAccept(android)}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (selected) void handleFile(selected);
        }}
      />
      <FieldError messages={error ? [error] : errors} />
    </div>
  );
}
