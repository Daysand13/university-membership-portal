import { NewsForm } from "@/components/admin/forms/NewsForm";
import { listNewsCategories } from "@/lib/services/news-service";

export const metadata = { title: "New Article" };
export const dynamic = "force-dynamic";

export default async function NewNewsPage() {
  const categories = await listNewsCategories();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-6">New Article</h1>
      <NewsForm categories={categories} />
    </div>
  );
}
