import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { Plus, Newspaper } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { NewsRowActions } from "@/components/admin/NewsRowActions";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { filterControlClasses } from "@/components/admin/FilterBar";
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
  await requireCapability("content.news");
  const { q } = await searchParams;
  const articles = await listNewsForAdmin({ search: q });

  const columns: Column<(typeof articles)[number]>[] = [
    {
      header: "Title",
      cell: (article) => (
        <>
          <p className="font-medium text-primary-950">{article.title}</p>
          {article.featured && <span className="text-[11px] text-accent-600 font-semibold">Featured</span>}
        </>
      ),
    },
    { header: "Category", cell: (article) => article.category?.name ?? "—" },
    { header: "Status", cell: (article) => <StatusBadge status={article.status} /> },
    { header: "Updated", cell: (article) => <span className="font-data text-xs">{formatDate(article.updatedAt)}</span> },
    {
      header: "Actions",
      actions: true,
      cell: (article) => <NewsRowActions id={article.id} status={article.status} />,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

      <form className="mb-5 w-full sm:w-80">
        <label htmlFor="news-q" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
          Search articles
        </label>
        <input
          id="news-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Title or category…"
          className={filterControlClasses}
        />
      </form>

      {articles.length === 0 ? (
        <EmptyState icon={<Newspaper size={28} />} title="No articles yet" description="Create your first news article to get started." />
      ) : (
        <DataTable caption="News articles" rows={articles} rowKey={(article) => article.id} columns={columns} />
      )}
    </div>
  );
}
