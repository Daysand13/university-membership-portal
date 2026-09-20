import { requireCapability } from "@/lib/auth/admin";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/forms/NewsForm";
import { getNewsForAdmin, listNewsCategories } from "@/lib/services/news-service";

export const metadata = { title: "Edit Article" };
export const dynamic = "force-dynamic";

export default async function EditNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCapability("content.news");
  const { id } = await params;
  const { created } = await searchParams;
  const [article, categories] = await Promise.all([getNewsForAdmin(id), listNewsCategories()]);
  if (!article) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">Edit Article</h1>
      {created === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Article created. It appears on the website once its status is Published.
        </div>
      )}
      <NewsForm article={article} categories={categories} />
    </div>
  );
}
