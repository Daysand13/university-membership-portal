import { notFound } from "next/navigation";
import { DocumentForm } from "@/components/admin/forms/DocumentForm";
import { getDocumentForAdmin, listDocumentCategories } from "@/lib/services/document-service";

export const metadata = { title: "Edit Document" };
export const dynamic = "force-dynamic";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [document, categories] = await Promise.all([getDocumentForAdmin(id), listDocumentCategories()]);
  if (!document) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Document</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <DocumentForm document={document} categories={categories} />
      </div>
    </div>
  );
}
