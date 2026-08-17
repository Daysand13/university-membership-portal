"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { requestAdminImageUpload } from "@/lib/actions/media-actions";
import type { MediaCategory } from "@/generated/prisma/client";

export function ImageUploadField({
  name,
  category,
  label,
  defaultUrl,
  aspect = "aspect-video",
}: {
  name: string;
  category: MediaCategory;
  label: string;
  defaultUrl?: string | null;
  aspect?: string;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const ticket = await requestAdminImageUpload({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category,
        });
        const putResponse = await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putResponse.ok) throw new Error("Upload failed");
        setUrl(ticket.publicUrl);
      } catch {
        setError(
          "Upload failed. If Cloudflare R2 isn't configured in this environment yet, image uploads won't work until it is.",
        );
      }
    });
  }

  return (
    <div>
      <p className="block text-sm font-medium text-primary-950 mb-1.5">{label}</p>
      <input type="hidden" name={name} value={url ?? ""} />
      <div
        className={`relative ${aspect} w-full rounded-md border border-dashed border-line bg-surface-muted overflow-hidden flex items-center justify-center`}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setUrl(null)}
              aria-label="Remove image"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-primary-950/70 text-white hover:bg-danger"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 text-slate-light hover:text-primary-700 py-8"
          >
            {isPending ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
            <span className="text-xs font-medium">{isPending ? "Uploading…" : "Click to upload an image"}</span>
          </button>
        )}
      </div>
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
      {url && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-semibold text-primary-800 hover:text-accent-600 mt-2"
        >
          Replace image
        </button>
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}
