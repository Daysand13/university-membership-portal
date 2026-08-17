import Link from "next/link";
import { Plus, Newspaper } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { NewsRowActions } from "@/components/admin/NewsRowActions";
import { listNewsForAdmin } from "@/lib/services/news-service";

export const metadata = { title: "News" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const articles = await listNewsForAdmin({ search: q });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">News</h1>
          <p className="text-sm text-slate mt-1">{articles.length} article{articles.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/news/new">
          <Button>
            <Plus size={16} /> New Article
          </Button>
        </Link>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search articles…"
          className="w-full sm:w-80 rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
      </form>

      {articles.length === 0 ? (
        <EmptyState icon={<Newspaper size={28} />} title="No articles yet" description="Create your first news article to get started." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Title</th>
                <th className="text-left px-5 py-3 font-semibold">Category</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-xs">
                    <p className="font-medium text-primary-950 truncate">{article.title}</p>
                    {article.featured && <span className="text-[11px] text-accent-600 font-semibold">Featured</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate">{article.category?.name ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{formatDate(article.updatedAt)}</td>
                  <td className="px-5 py-3.5">
                    <NewsRowActions id={article.id} status={article.status} />
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
