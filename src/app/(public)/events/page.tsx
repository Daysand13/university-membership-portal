import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState, Pagination } from "@/components/ui/Common";
import { listPublishedEvents } from "@/lib/services/event-service";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string; page?: string }>;
}) {
  const params = await searchParams;
  const when = params.when === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number(params.page) || 1);

  const { items, totalPages } = await listPublishedEvents({ when, page });

  return (
    <div className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <SectionHeading kicker="Mark Your Calendar" title="Events" description="What's happening across the association." />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="inline-flex rounded-md border border-line p-1 bg-surface-muted mb-10">
          <Link
            href="/events"
            className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
              when === "upcoming" ? "bg-white text-primary-800 shadow-sm" : "text-slate"
            }`}
          >
            Upcoming
          </Link>
          <Link
            href="/events?when=past"
            className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
              when === "past" ? "bg-white text-primary-800 shadow-sm" : "text-slate"
            }`}
          >
            Past Events
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((event) => (
              <EventCard key={event.id} event={event} isPast={when === "past"} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarX2 size={28} />}
            title={when === "past" ? "No past events on record" : "No upcoming events scheduled"}
            description="Published events will appear here."
          />
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath={`/events?when=${when}`} />
      </div>
    </div>
  );
}
