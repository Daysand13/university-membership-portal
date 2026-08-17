import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { EventRowActions } from "@/components/admin/EventRowActions";
import { listEventsForAdmin } from "@/lib/services/event-service";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const events = await listEventsForAdmin({ search: q });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search events…"
          className="w-full sm:w-80 rounded-md border border-line bg-white px-3.5 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
        />
      </form>

      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays size={28} />} title="No events yet" description="Create your first event to get started." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Title</th>
                <th className="text-left px-5 py-3 font-semibold">Venue</th>
                <th className="text-left px-5 py-3 font-semibold">Dates</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-xs">
                    <p className="font-medium text-primary-950 truncate">{event.title}</p>
                    {event.featured && <span className="text-[11px] text-accent-600 font-semibold">Featured</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate truncate max-w-[160px]">{event.venue}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">
                    {formatDate(event.startDate)} – {formatDate(event.endDate)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <EventRowActions id={event.id} status={event.status} />
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
