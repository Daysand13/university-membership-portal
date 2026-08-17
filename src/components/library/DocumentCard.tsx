import { FileText, ImageIcon, FileArchive, FileSpreadsheet } from "lucide-react";
import { DownloadButton } from "./DownloadButton";
import type { Document, DocumentCategory } from "@/generated/prisma/client";

type DocumentCardData = Document & { category: DocumentCategory | null };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IconForMime({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet size={22} />;
  if (mimeType.includes("zip")) return <FileArchive size={22} />;
  if (mimeType.startsWith("image/")) return <ImageIcon size={22} />;
  return <FileText size={22} />;
}

export function DocumentCard({ document }: { document: DocumentCardData }) {
  return (
    <div className="flex flex-col bg-white rounded-lg border border-line p-5 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
          <IconForMime mimeType={document.mimeType} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-[15px] leading-snug text-primary-950 line-clamp-2">
            {document.title}
          </h3>
          {document.category && <p className="text-xs text-slate mt-1">{document.category.name}</p>}
        </div>
      </div>
      {document.description && (
        <p className="mt-3 text-sm text-slate leading-relaxed line-clamp-2">{document.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between pt-4 border-t border-line">
        <span className="text-xs text-slate-light font-data">
          {formatFileSize(document.fileSize)}
          {document.version ? ` · v${document.version}` : ""}
        </span>
        <DownloadButton
          documentId={document.id}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
