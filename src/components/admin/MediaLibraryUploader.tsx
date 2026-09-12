"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { confirmMediaLibraryUpload } from "@/lib/actions/media-actions";
import { uploadAdminFile } from "@/lib/client/admin-upload";
import { Button } from "@/components/ui/Button";

export function MediaLibraryUploader() {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File) {
    setError(null);
    setProgress(0);
    startTransition(async () => {
      const outcome = await uploadAdminFile({
        file,
        kind: "image",
        category: "OTHER",
        onProgress: setProgress,
      });
      setProgress(null);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      try {
        await confirmMediaLibraryUpload({
          objectKey: outcome.objectKey,
          mimeType: outcome.mimeType,
          fileSize: outcome.fileSize,
          filename: outcome.filename,
          category: "OTHER",
        });
        router.refresh();
      } catch (err) {
        // The file itself is safely in storage — only the library record
        // failed, so say that rather than implying the upload was lost.
        console.error("[media-library] upload stored but recording it failed", err);
        setError("The image uploaded, but adding it to the library failed. Please refresh the page and try again.");
      }
    });
  }

  const percent = progress !== null ? Math.round(progress * 100) : 0;

  return (
    <div>
      <Button type="button" variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        {isPending ? (percent > 0 ? `Uploading… ${percent}%` : "Uploading…") : "Upload Image"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-danger mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
