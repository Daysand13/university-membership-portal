import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/forms/NewsForm";
import { getNewsForAdmin, listNewsCategories } from "@/lib/services/news-service";

export const metadata = { title: "Edit Article" };
export const dynamic = "force-dynamic";

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categories] = await Promise.all([getNewsForAdmin(id), listNewsCategories()]);
  if (!article) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Article</h1>
      <NewsForm article={article} categories={categories} />
    </div>
  );
}
