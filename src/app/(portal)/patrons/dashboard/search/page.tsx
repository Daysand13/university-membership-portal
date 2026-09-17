import Link from "next/link";
import { Search } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { searchPatronPortal } from "@/lib/services/patron-insights-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { inputClasses } from "@/components/ui/Common";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

interface ResultGroup {
  title: string;
  items: { key: string; href: string; label: string; detail: string }[];
}

export default async function PatronSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePatron();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = await searchPatronPortal(query);

  const groups: ResultGroup[] = [
    {
      title: "Alumni",
      items: results.alumni.map((a) => ({
        key: a.id,
        href: `/patrons/dashboard/membership?q=${encodeURIComponent(a.fullName)}#directory`,
        label: a.fullName,
        detail: a.detail,
      })),
    },
    {
      title: "Documents",
      items: results.documents.map((d) => ({
        key: d.id,
        href: `/patrons/dashboard/documents?q=${encodeURIComponent(d.title)}`,
        label: d.title,
        detail: d.detail,
      })),
    },
    {
      title: "Announcements",
      items: results.announcements.map((a) => ({
        key: a.id,
        href: "/patrons/dashboard/messages",
        label: a.subject,
        detail: a.detail,
      })),
    },
    {
      title: "Campaigns",
      items: results.campaigns.map((c) => ({
        key: c.id,
        href: `/patrons/dashboard/advocacy/campaigns/${c.id}`,
        label: c.title,
        detail: c.detail,
      })),
    },
    {
      title: "Escalated Issues",
      items: results.issues.map((i) => ({
        key: i.id,
        href: `/patrons/dashboard/advocacy/issues/${i.id}`,
        label: i.title,
        detail: i.detail,
      })),
    },
    {
      title: "News",
      items: results.news.map((n) => ({ key: n.slug, href: `/news/${n.slug}`, label: n.title, detail: n.detail })),
    },
  ].filter((group) => group.items.length > 0);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <PortalPageHeader
        title="Search"
        description="Find alumni in the directory, documents, announcements, campaigns, escalated issues and news."
      />

      <form role="search" className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="portal-search" className="sr-only">
          Search the Patrons&apos; Portal
        </label>
        <input
          id="portal-search"
          name="q"
          type="search"
          defaultValue={query}
          minLength={2}
          placeholder="What are you looking for?"
          className={`${inputClasses} sm:flex-1`}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-800 px-5 py-2.5 min-h-11 text-sm font-semibold text-white hover:bg-primary-900"
        >
          <Search size={16} aria-hidden="true" /> Search
        </button>
      </form>

      {query.length >= 2 && (
        <p role="status" className="text-sm text-slate">
          {total === 0 ? `Nothing found for “${query}”.` : `${total} result${total === 1 ? "" : "s"} for “${query}”`}
        </p>
      )}

      {groups.map((group, i) => (
        <section key={group.title} aria-labelledby={`results-${i}`} className="bg-white rounded-xl border border-line shadow-card p-5">
          <h2 id={`results-${i}`} className="font-display font-bold text-lg text-primary-950 mb-2">
            {group.title}
          </h2>
          <ul className="divide-y divide-line">
            {group.items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="block py-2.5 hover:bg-surface-muted rounded-md px-2 -mx-2">
                  <span className="block font-semibold text-primary-950">{item.label}</span>
                  <span className="block text-sm text-slate">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
