"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { requestAdminImageUpload, confirmMediaLibraryUpload } from "@/lib/actions/media-actions";
import { Button } from "@/components/ui/Button";

export function MediaLibraryUploader() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFile(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const ticket = await requestAdminImageUpload({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: "OTHER",
        });
        const res = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!res.ok) throw new Error("upload failed");
        await confirmMediaLibraryUpload({
          objectKey: ticket.objectKey,
          mimeType: file.type,
          fileSize: file.size,
          filename: file.name,
          category: "OTHER",
        });
        router.refresh();
      } catch {
        setError("Upload failed. Check that Cloudflare R2 is configured for this environment.");
      }
    });
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        {isPending ? "Uploading…" : "Upload Image"}
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
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}
