import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { DocumentRowActions } from "@/components/admin/DocumentRowActions";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { filterControlClasses } from "@/components/admin/FilterBar";
import { listDocumentsForAdmin } from "@/lib/services/document-service";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string }>;
}) {
  await requireCapability("library.documents");
  const { q, source } = await searchParams;
  const fromPatrons = source === "patrons";
  const documents = await listDocumentsForAdmin({ search: q, fromPatrons });
  const tabClasses = (active: boolean) =>
    `px-3.5 py-2 text-sm font-semibold border-b-2 ${
      active ? "border-primary-800 text-primary-950" : "border-transparent text-slate hover:text-primary-800"
    }`;

  const columns: Column<(typeof documents)[number]>[] = [
    {
      header: "Title",
      cell: (doc) => (
        <>
          <p className="font-medium text-primary-950">{doc.title}</p>
          <span className="flex flex-wrap gap-x-2">
            {doc.audience === "PATRONS" ? (
              <span className="text-[11px] text-primary-800 font-semibold">Patrons only</span>
            ) : (
              !doc.isPublic && <span className="text-[11px] text-warning font-semibold">Private</span>
            )}
            {doc.uploadedByPatron && (
              <span className="text-[11px] text-slate">
                From patron {[doc.uploadedByPatron.title, doc.uploadedByPatron.fullName].filter(Boolean).join(" ")}
              </span>
            )}
          </span>
        </>
      ),
    },
    { header: "Category", cell: (doc) => doc.category?.name ?? "—" },
    { header: "Size", cell: (doc) => <span className="font-data text-xs">{formatFileSize(doc.fileSize)}</span> },
    { header: "Downloads", cell: (doc) => <span className="font-data text-xs">{doc.downloadCount}</span> },
    { header: "Status", cell: (doc) => <StatusBadge status={doc.status} /> },
    { header: "Actions", actions: true, cell: (doc) => <DocumentRowActions id={doc.id} /> },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

      <nav aria-label="Library filter" className="mb-4 border-b border-line flex gap-1">
        <Link href="/admin/library" aria-current={!fromPatrons ? "page" : undefined} className={tabClasses(!fromPatrons)}>
          All Documents
        </Link>
        <Link
          href="/admin/library?source=patrons"
          aria-current={fromPatrons ? "page" : undefined}
          className={tabClasses(fromPatrons)}
        >
          From Patrons
        </Link>
      </nav>

      <form className="mb-5 w-full sm:w-80">
        {fromPatrons && <input type="hidden" name="source" value="patrons" />}
        <label htmlFor="library-q" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
          Search documents
        </label>
        <input
          id="library-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Title or category…"
          className={filterControlClasses}
        />
      </form>

      {documents.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title="No documents yet" description="Upload your first document to the resource library." />
      ) : (
        <DataTable caption="Library documents" rows={documents} rowKey={(doc) => doc.id} columns={columns} />
      )}
    </div>
  );
}
