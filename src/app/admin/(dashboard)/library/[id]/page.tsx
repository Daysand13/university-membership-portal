import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/admin/forms/DocumentForm";
import { getDocumentForAdmin, listDocumentCategories } from "@/lib/services/document-service";

export const metadata = { title: "Edit Document" };
export const dynamic = "force-dynamic";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("library.documents");
  const { id } = await params;
  const [document, categories] = await Promise.all([getDocumentForAdmin(id), listDocumentCategories()]);
  if (!document) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Document</h1>
      {document.uploadedByPatron && (
        <div className="mb-5 rounded-lg border border-accent-400 bg-accent-100 px-4 py-3 text-sm text-primary-950">
          Uploaded by patron{" "}
          <Link href={`/admin/patrons/${document.uploadedByPatron.id}`} className="font-semibold underline">
            {[document.uploadedByPatron.title, document.uploadedByPatron.fullName].filter(Boolean).join(" ")}
          </Link>{" "}
          from the Patrons&apos; Portal.{" "}
          {document.status === "DRAFT"
            ? "Check it, then set the status to Published to share it with all patrons."
            : "It has been reviewed."}
        </div>
      )}
      <div className="bg-white rounded-lg border border-line p-6">
        <DocumentForm document={document} categories={categories} />
      </div>
    </div>
  );
}
