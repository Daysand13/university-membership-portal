import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPublishedEvents } from "@/lib/services/event-service";
import { PortalPageHeader } from "./PortalPageHeader";
import { UpcomingEventsList } from "./UpcomingEventsList";

/** The events page inside either portal — the same published events as the public site, kept within the portal frame. */
export async function PortalEventsPage({ title, description }: { title: string; description: string }) {
  const { items } = await listPublishedEvents({ when: "upcoming", pageSize: 20 });

  return (
    <>
      <PortalPageHeader title={title} description={description} />
      <section
        aria-labelledby="upcoming-events-heading"
        className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6"
      >
        <h2 id="upcoming-events-heading" className="font-display font-bold text-lg text-primary-950 mb-4">
          Upcoming
        </h2>
        <UpcomingEventsList events={items} emptyText="No upcoming events have been announced yet. Please check back soon." />
      </section>
      <p className="mt-4">
        <Link
          href="/events?when=past"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
        >
          Browse past events <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
