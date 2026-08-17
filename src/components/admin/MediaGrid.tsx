"use client";

import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteAdminMedia } from "@/lib/actions/media-actions";
import type { Media } from "@/generated/prisma/client";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({ items }: { items: Media[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.id} className="group relative bg-white rounded-lg border border-line overflow-hidden">
          <div className="aspect-square bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.publicUrl ?? undefined} alt={item.altText ?? item.filename} className="w-full h-full object-cover" />
          </div>
          <div className="p-2.5">
            <p className="text-xs font-medium text-ink truncate">{item.filename}</p>
            <p className="text-[11px] text-slate-light">{formatFileSize(item.fileSize)}</p>
          </div>
          <ConfirmButton
            action={() => deleteAdminMedia(item.id)}
            confirmMessage="Delete this file from the media library and R2?"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-primary-950/70 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition-opacity"
          >
            <Trash2 size={13} />
          </ConfirmButton>
        </div>
      ))}
    </div>
  );
}
