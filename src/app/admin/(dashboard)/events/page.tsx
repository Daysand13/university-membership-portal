import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { EventRowActions } from "@/components/admin/EventRowActions";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { filterControlClasses } from "@/components/admin/FilterBar";
import { listEventsForAdmin } from "@/lib/services/event-service";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireCapability("content.events");
  const { q } = await searchParams;
  const events = await listEventsForAdmin({ search: q });

  const columns: Column<(typeof events)[number]>[] = [
    {
      header: "Title",
      cell: (event) => (
        <>
          <p className="font-medium text-primary-950">{event.title}</p>
          {event.featured && <span className="text-[11px] text-accent-600 font-semibold">Featured</span>}
        </>
      ),
    },
    { header: "Venue", cell: (event) => event.venue },
    {
      header: "Dates",
      cell: (event) => (
        <span className="font-data text-xs">
          {formatDate(event.startDate)} – {formatDate(event.endDate)}
        </span>
      ),
    },
    { header: "Status", cell: (event) => <StatusBadge status={event.status} /> },
    {
      header: "Actions",
      actions: true,
      cell: (event) => <EventRowActions id={event.id} status={event.status} />,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">Events</h1>
          <p className="text-sm text-slate mt-1">{events.length} event{events.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus size={16} /> New Event
          </Button>
        </Link>
      </div>

      <form className="mb-5 w-full sm:w-80">
        <label htmlFor="events-q" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
          Search events
        </label>
        <input
          id="events-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Title or venue…"
          className={filterControlClasses}
        />
      </form>

      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays size={28} />} title="No events yet" description="Create your first event to get started." />
      ) : (
        <DataTable caption="Events" rows={events} rowKey={(event) => event.id} columns={columns} />
      )}
    </div>
  );
}
