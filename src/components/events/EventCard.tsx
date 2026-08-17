import Link from "next/link";
import { MapPin, ImageIcon } from "lucide-react";
import type { Event, EventCategory } from "@/generated/prisma/client";

type EventCardData = Event & { category: EventCategory | null };

function DateBlock({ date }: { date: Date }) {
  const day = new Intl.DateTimeFormat("en-GH", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("en-GH", { month: "short" }).format(date).toUpperCase();
  return (
    <div className="absolute top-3 left-3 bg-white rounded-md shadow-sm overflow-hidden w-14 text-center border border-line">
      <div className="bg-primary-800 text-white text-[10px] font-semibold uppercase tracking-wide py-0.5">
        {month}
      </div>
      <div className="font-display font-bold text-lg text-primary-950 py-0.5 font-data">{day}</div>
    </div>
  );
}

export function EventCard({ event, isPast = false }: { event: EventCardData; isPast?: boolean }) {
  return (
    <article className="group flex flex-col bg-white rounded-lg border border-line overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <Link href={`/events/${event.slug}`} className="block aspect-[16/10] bg-primary-50 relative overflow-hidden">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-200">
            <ImageIcon size={32} />
          </div>
        )}
        <DateBlock date={event.startDate} />
        {isPast && (
          <span className="absolute top-3 right-3 bg-slate-500/90 text-white text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded">
            Past Event
          </span>
        )}
      </Link>
      <div className="flex-1 flex flex-col p-5">
        {event.category && <p className="kicker mb-1.5">{event.category.name}</p>}
        <h3 className="font-display font-bold text-lg leading-snug text-primary-950">
          <Link href={`/events/${event.slug}`} className="hover:text-primary-700">
            {event.title}
          </Link>
        </h3>
        {event.shortDescription && (
          <p className="mt-2 text-sm text-slate leading-relaxed line-clamp-2">{event.shortDescription}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate">
          <MapPin size={13} />
          {event.venue}
        </div>
      </div>
    </article>
  );
}
