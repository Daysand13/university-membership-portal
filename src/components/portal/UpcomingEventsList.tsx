import Link from "next/link";

const TIME_ZONE = "Africa/Accra";
const dayFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", timeZone: TIME_ZONE });
const monthFormat = new Intl.DateTimeFormat("en-GH", { month: "short", timeZone: TIME_ZONE });
const fullDateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

export interface UpcomingEvent {
  id: string;
  title: string;
  slug: string;
  startDate: Date;
  startTime?: string | null;
  venue?: string | null;
  shortDescription?: string | null;
}

export function UpcomingEventsList({ events, emptyText }: { events: UpcomingEvent[]; emptyText: string }) {
  if (events.length === 0) return <p className="text-slate">{emptyText}</p>;

  return (
    <ul className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="w-12 shrink-0 self-start rounded-lg bg-primary-50 text-primary-800 text-center py-1.5"
          >
            <span className="block text-lg font-bold leading-none">{dayFormat.format(event.startDate)}</span>
            <span className="block text-[11px] uppercase font-semibold mt-1">{monthFormat.format(event.startDate)}</span>
          </span>
          <div className="min-w-0">
            <Link
              href={`/events/${event.slug}`}
              className="font-semibold text-primary-800 hover:text-accent-600 hover:underline break-words"
            >
              {event.title}
            </Link>
            <p className="text-sm text-slate mt-0.5">
              <time dateTime={event.startDate.toISOString()}>{fullDateFormat.format(event.startDate)}</time>
              {event.startTime ? ` · ${event.startTime}` : ""}
              {event.venue ? ` · ${event.venue}` : ""}
            </p>
            {event.shortDescription && <p className="text-sm text-slate mt-1 line-clamp-2">{event.shortDescription}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
