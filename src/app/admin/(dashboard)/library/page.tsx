import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { DocumentRowActions } from "@/components/admin/DocumentRowActions";
import { listDocumentsForAdmin } from "@/lib/services/document-service";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminLibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const documents = await listDocumentsForAdmin({ search: q });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Library</h1>
          <p className="text-sm text-slate mt-1">{documents.length} document{documents.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/library/new">
          <Button>
            <Plus size={16} /> Upload Document
          </Button>
        </Link>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search documents…"
          className="w-full sm:w-80 rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
      </form>

      {documents.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title="No documents yet" description="Upload your first document to the resource library." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Title</th>
                <th className="text-left px-5 py-3 font-semibold">Category</th>
                <th className="text-left px-5 py-3 font-semibold">Size</th>
                <th className="text-left px-5 py-3 font-semibold">Downloads</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-xs">
                    <p className="font-medium text-primary-950 truncate">{doc.title}</p>
                    {!doc.isPublic && <span className="text-[11px] text-warning font-semibold">Private</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate">{doc.category?.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{doc.downloadCount}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <DocumentRowActions id={doc.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
