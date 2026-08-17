"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, FileCheck2, X } from "lucide-react";
import { requestAdminDocumentUpload } from "@/lib/actions/media-actions";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadField() {
  const [file, setFile] = useState<{ name: string; size: number; objectKey: string; mimeType: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File) {
    setError(null);
    startTransition(async () => {
      try {
        const ticket = await requestAdminDocumentUpload({
          filename: selected.name,
          mimeType: selected.type || "application/octet-stream",
          fileSize: selected.size,
        });
        const res = await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selected.type || "application/octet-stream" },
          body: selected,
        });
        if (!res.ok) throw new Error("upload failed");
        setFile({
          name: selected.name,
          size: selected.size,
          objectKey: ticket.objectKey,
          mimeType: selected.type || "application/octet-stream",
        });
      } catch {
        setError("Upload failed. If Cloudflare R2 isn't configured in this environment yet, this won't work until it is.");
      }
    });
  }

  return (
    <div>
      <p className="block text-sm font-medium text-primary-950 mb-1.5">
        File <span className="text-danger">*</span>
      </p>
      {file && (
        <>
          <input type="hidden" name="objectKey" value={file.objectKey} />
          <input type="hidden" name="mimeType" value={file.mimeType} />
          <input type="hidden" name="fileSize" value={file.size} />
        </>
      )}

      {file ? (
        <div className="flex items-center justify-between rounded-md border border-line bg-surface-muted px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck2 size={18} className="text-success shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{file.name}</p>
              <p className="text-xs text-slate-light">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="p-1.5 text-slate hover:text-danger shrink-0">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line bg-surface-muted py-8 text-slate-light hover:text-primary-700"
        >
          {isPending ? <Loader2 size={22} className="animate-spin" /> : <FileUp size={22} />}
          <span className="text-xs font-medium">{isPending ? "Uploading…" : "Click to upload a document (PDF, DOC, XLS, PPT, ZIP, image)"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.jpg,.jpeg,.png"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFile(selected);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
