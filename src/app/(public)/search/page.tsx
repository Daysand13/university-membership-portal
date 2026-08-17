import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, Newspaper, CalendarDays, FileText } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/Common";
import { listPublishedNews } from "@/lib/services/news-service";
import { listPublishedEvents } from "@/lib/services/event-service";
import { listPublishedDocuments } from "@/lib/services/document-service";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [news, events, documents] = query
    ? await Promise.all([
        listPublishedNews({ search: query, pageSize: 8 }),
        listPublishedEvents({ when: "upcoming", pageSize: 8 }).then(async (upcoming) => {
          // Search spans both upcoming and past events, so merge both windows.
          const past = await listPublishedEvents({ when: "past", pageSize: 8 });
          const q2 = query.toLowerCase();
          return {
            items: [...upcoming.items, ...past.items].filter(
              (e) => e.title.toLowerCase().includes(q2) || e.description.toLowerCase().includes(q2),
            ),
          };
        }),
        listPublishedDocuments({ search: query, pageSize: 8 }),
      ])
    : [{ items: [] }, { items: [] }, { items: [] }];

  const totalResults = news.items.length + events.items.length + documents.items.length;

  return (
    <div className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
          <SectionHeading kicker="Search" title="Search the Portal" description="Find news, events, and library documents." />
          <form action="/search" className="mt-6 relative">
            <SearchIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-light" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Search news, events, documents…"
              className="w-full rounded-md border border-line bg-white pl-11 pr-4 py-3 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
            />
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {!query ? (
          <p className="text-center text-slate py-8">Enter a search term above to get started.</p>
        ) : totalResults === 0 ? (
          <EmptyState icon={<SearchIcon size={28} />} title={`No results for "${query}"`} description="Try a different search term." />
        ) : (
          <div className="space-y-10">
            {news.items.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                  <Newspaper size={16} className="text-accent-500" /> News
                </h2>
                <ul className="space-y-1">
                  {news.items.map((item) => (
                    <li key={item.id}>
                      <Link href={`/news/${item.slug}`} className="block py-2.5 border-b border-line hover:text-primary-800">
                        <p className="text-sm font-medium text-primary-950">{item.title}</p>
                        <p className="text-xs text-slate-light mt-0.5 line-clamp-1">{item.excerpt}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {events.items.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                  <CalendarDays size={16} className="text-accent-500" /> Events
                </h2>
                <ul className="space-y-1">
                  {events.items.map((item) => (
                    <li key={item.id}>
                      <Link href={`/events/${item.slug}`} className="block py-2.5 border-b border-line hover:text-primary-800">
                        <p className="text-sm font-medium text-primary-950">{item.title}</p>
                        <p className="text-xs text-slate-light mt-0.5">{item.venue}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {documents.items.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                  <FileText size={16} className="text-accent-500" /> Library Documents
                </h2>
                <ul className="space-y-1">
                  {documents.items.map((item) => (
                    <li key={item.id}>
                      <Link href="/library" className="block py-2.5 border-b border-line hover:text-primary-800">
                        <p className="text-sm font-medium text-primary-950">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-light mt-0.5 line-clamp-1">{item.description}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
