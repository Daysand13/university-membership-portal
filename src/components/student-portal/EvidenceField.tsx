"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { FileAudio, FileCheck2, FileUp, Image as ImageIcon, Loader2, X } from "lucide-react";
import { prepareAndUpload } from "@/lib/client/upload-attachment";
import { barrierEvidenceAccept, isAndroidDevice } from "@/lib/client/file-accept";
import { formatFileSize } from "@/lib/patron-portal-options";
import { MAX_BARRIER_EVIDENCE_FILES, isAudioType } from "@/lib/portal-options";
import { FieldError } from "@/components/ui/Common";

const noSubscription = () => () => {};

interface Attached {
  filename: string;
  bytes: number;
  token: string;
  isAudio: boolean;
}

/**
 * Evidence for a barrier report: up to three photos, voice notes or PDFs.
 *
 * A voice note matters more here than anywhere else in the portal. A
 * student who finds typing slow or painful can hold their phone up, say what
 * happened, and attach it — which is often a better account of a barrier
 * than anything they'd have written.
 *
 * Each file goes to storage as it's chosen (with progress, retries and a
 * same-origin fallback — see lib/client/upload-attachment); the form
 * carries only the signed tickets naming them.
 */
export function EvidenceField({ errors }: { errors?: string[] }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const android = useSyncExternalStore(
    noSubscription,
    () => isAndroidDevice(navigator),
    () => false,
  );
  const [files, setFiles] = useState<Attached[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const full = files.length >= MAX_BARRIER_EVIDENCE_FILES;

  async function handleFile(selected: File) {
    setError(null);
    setProgress(0);
    const outcome = await prepareAndUpload({
      kind: "barrier-evidence",
      file: selected,
      targetBytes: Math.floor(1.5 * 1024 * 1024),
      ticketUrl: "/api/student/upload/ticket",
      fallbackUrl: "/api/student/upload",
      onProgress: setProgress,
    });
    setProgress(null);
    if (outcome.status === "error") {
      setError(outcome.message);
    } else if (outcome.status === "skipped") {
      setError("File storage isn't available right now, so this file can't be attached.");
    } else {
      setFiles((current) => [
        ...current,
        {
          filename: outcome.filename,
          bytes: outcome.bytes,
          token: outcome.token,
          isAudio: isAudioType(selected.type),
        },
      ]);
    }
  }

  const busy = progress !== null;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-primary-950 mb-1.5">
        Photos or a voice note (optional)
      </label>
      <p className="text-xs text-slate mb-2">
        A photo of the barrier, or a recording of you describing it, helps the executives act on this. Up to{" "}
        {MAX_BARRIER_EVIDENCE_FILES} files. Only you and the association&apos;s executives can open them.
      </p>

      {files.map((file, index) => (
        <div key={file.token}>
          <input type="hidden" name="evidenceToken" value={file.token} />
          <input type="hidden" name="evidenceName" value={file.filename} />
          <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-4 py-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {file.isAudio ? (
                <FileAudio size={18} aria-hidden="true" className="text-success shrink-0" />
              ) : (
                <FileCheck2 size={18} aria-hidden="true" className="text-success shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{file.filename}</p>
                <p className="text-xs text-slate">
                  {formatFileSize(file.bytes)} · {file.isAudio ? "voice note attached" : "attached"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
              aria-label={`Remove ${file.filename}`}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate hover:text-danger shrink-0"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}

      {!full && (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line bg-surface-muted py-6 text-slate hover:text-primary-700 disabled:cursor-wait"
        >
          {busy ? (
            <Loader2 size={22} aria-hidden="true" className="animate-spin" />
          ) : (
            <span className="flex items-center gap-2" aria-hidden="true">
              <ImageIcon size={22} />
              <FileUp size={22} />
            </span>
          )}
          <span className="text-sm font-medium" aria-live="polite">
            {busy ? (percent > 0 ? `Uploading… ${percent}%` : "Preparing…") : files.length > 0 ? "Add another file" : "Add a photo, recording or PDF"}
          </span>
          <span className="text-xs">JPG, PNG, PDF or a voice recording · up to 20 MB each</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={barrierEvidenceAccept(android)}
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
