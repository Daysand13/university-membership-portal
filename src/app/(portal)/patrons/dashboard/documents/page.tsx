import Link from "next/link";
import { FileText, FolderOpen, Lock, Upload } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { listDocumentCategories, listPatronLibrary, listPatronUploads } from "@/lib/services/document-service";
import { deletePatronUploadAction } from "@/lib/actions/patron-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DownloadButton } from "@/components/library/DownloadButton";
import { PatronDocumentUploadForm } from "@/components/patron-portal/PatronDocumentUploadForm";
import { formatFileSize } from "@/lib/patron-portal-options";
import { inputClasses } from "@/components/ui/Common";

export const metadata = { title: "Governance & Documents" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

export default async function PatronDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const patron = await requirePatron();
  const { category, q } = await searchParams;
  const [documents, categories, uploads] = await Promise.all([
    listPatronLibrary({ categoryId: category || undefined, search: q?.trim() || undefined }),
    listDocumentCategories(),
    listPatronUploads(patron.id),
  ]);

  // Group by category, keeping the library's own order within each.
  const groups = new Map<string, { name: string; items: typeof documents }>();
  for (const doc of documents) {
    const key = doc.category?.id ?? "none";
    if (!groups.has(key)) groups.set(key, { name: doc.category?.name ?? "Other Documents", items: [] });
    groups.get(key)!.items.push(doc);
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Governance & Documents"
        description="Executive reports, financial audits, the constitution, rights charters and minutes of executive–patron briefings."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section aria-labelledby="library-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
              <FolderOpen size={20} />
            </span>
            <h2 id="library-heading" className="font-display font-bold text-xl text-primary-950">
              Document Library
            </h2>
          </div>

          <form role="search" className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-end mb-5">
            <div>
              <label htmlFor="docs-q" className="block text-sm font-medium text-primary-950 mb-1.5">
                Search
              </label>
              <input id="docs-q" name="q" type="search" defaultValue={q} className={inputClasses} />
            </div>
            <div>
              <label htmlFor="docs-category" className="block text-sm font-medium text-primary-950 mb-1.5">
                Category
              </label>
              <select id="docs-category" name="category" defaultValue={category ?? ""} className={inputClasses}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary-800 px-4 py-2.5 min-h-11 text-sm font-semibold text-white hover:bg-primary-900"
            >
              Filter
            </button>
          </form>

          {documents.length === 0 ? (
            <p className="text-slate">
              {q || category ? "No documents match." : "No documents have been published yet."}{" "}
              {(q || category) && (
                <Link href="/patrons/dashboard/documents" className="font-semibold text-primary-800 underline">
                  Show all
                </Link>
              )}
            </p>
          ) : (
            <div className="space-y-6">
              {[...groups.entries()].map(([key, group]) => (
                <div key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">{group.name}</h3>
                  <ul className="divide-y divide-line border-y border-line">
                    {group.items.map((doc) => (
                      <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                        <FileText size={20} aria-hidden="true" className="hidden sm:block text-slate shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-primary-950">
                            {doc.title}
                            {doc.audience === "PATRONS" && (
                              <span className="ml-2 inline-flex items-center gap-1 align-middle rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-primary-950">
                                <Lock size={11} aria-hidden="true" /> Patrons only
                              </span>
                            )}
                          </p>
                          {doc.description && <p className="text-sm text-slate line-clamp-2">{doc.description}</p>}
                          <p className="text-xs text-slate-light">
                            {[
                              doc.version,
                              dateFormat.format(doc.createdAt),
                              formatFileSize(doc.fileSize),
                              doc.uploadedByPatron &&
                                `Shared by ${[doc.uploadedByPatron.title, doc.uploadedByPatron.fullName].filter(Boolean).join(" ")}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <DownloadButton
                          documentId={doc.id}
                          forPatron
                          label="Open"
                          className="inline-flex items-center gap-1.5 rounded-md border border-primary-800 px-3 py-2 min-h-11 text-sm font-semibold text-primary-800 hover:bg-primary-50"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="upload-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
            <h2 id="upload-heading" className="flex items-center gap-2 font-display font-bold text-lg text-primary-950 mb-1">
              <Upload size={20} aria-hidden="true" className="text-primary-800" /> Share a Document
            </h2>
            <p className="text-sm text-slate mb-4">
              Guidance notes, advisory letters or recommended policy templates. The team reviews each upload before
              it&apos;s shared with all patrons.
            </p>
            <PatronDocumentUploadForm />
          </section>

          <DashboardCard id="my-uploads" title="Your Uploads" icon={<FileText size={20} />}>
            {uploads.length === 0 ? (
              <p className="text-slate">Documents you upload will be listed here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {uploads.map((doc) => (
                  <li key={doc.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-primary-950 min-w-0 break-words">{doc.title}</p>
                      <StatusBadge
                        status={doc.status === "PUBLISHED" ? "PUBLISHED" : doc.status === "DRAFT" ? "PENDING" : doc.status}
                        label={doc.status === "PUBLISHED" ? "Shared" : doc.status === "DRAFT" ? "Awaiting review" : "Archived"}
                      />
                    </div>
                    <p className="text-xs text-slate">
                      {dateFormat.format(doc.createdAt)} · {formatFileSize(doc.fileSize)}
                    </p>
                    {doc.status === "DRAFT" && (
                      <ConfirmButton
                        action={deletePatronUploadAction.bind(null, doc.id)}
                        confirmMessage={`Delete "${doc.title}"? The team won't see it any more.`}
                        className="mt-1 text-sm font-semibold text-slate hover:text-danger underline"
                      >
                        Delete
                      </ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
