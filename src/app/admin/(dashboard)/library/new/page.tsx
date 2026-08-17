import { DocumentForm } from "@/components/admin/forms/DocumentForm";
import { listDocumentCategories } from "@/lib/services/document-service";

export const metadata = { title: "Upload Document" };
export const dynamic = "force-dynamic";

export default async function NewDocumentPage() {
  const categories = await listDocumentCategories();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Upload Document</h1>
      <div className="bg-white rounded-lg border border-line p-6">
        <DocumentForm categories={categories} />
      </div>
    </div>
  );
}
