"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { getDocumentDownloadUrlAction } from "@/lib/actions/document-actions";

export function DownloadButton({ documentId, className }: { documentId: string; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const url = await getDocumentDownloadUrlAction(documentId);
              window.open(url, "_blank", "noopener,noreferrer");
            } catch {
              setError("This document couldn't be downloaded. Please try again.");
            }
          });
        }}
        className={className}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {isPending ? "Preparing…" : "Download"}
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
