import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Clock, User, Phone, ExternalLink, ImageIcon } from "lucide-react";
import { getPublishedEventBySlug } from "@/lib/services/event-service";

export const dynamic = "force-dynamic";

function formatDateRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });
  const startStr = fmt.format(start);
  const endStr = fmt.format(end);
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.shortDescription || event.description.slice(0, 150),
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  // Server Component, re-executed fresh per request (this route is
  // force-dynamic via the parent layout) — reading the current time here
  // is intentional, not the "unstable across client re-renders" case the
  // purity rule guards against.
  // eslint-disable-next-line react-hooks/purity
  const isPast = event.endDate.getTime() < Date.now();

  return (
    <article className="bg-white">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/events" className="inline-flex items-center gap-1 text-sm text-primary-800 font-medium hover:text-accent-600 mb-6">
            <ChevronLeft size={15} /> Back to Events
          </Link>
          <div className="flex items-center gap-3 mb-3">
            {event.category && <p className="kicker">{event.category.name}</p>}
            {isPast && (
              <span className="bg-slate-500 text-white text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded">
                Past Event
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-950 text-balance leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="aspect-[16/9] bg-primary-50 rounded-lg overflow-hidden mb-8 border border-line">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-200">
                <ImageIcon size={40} />
              </div>
            )}
          </div>
          <div className="prose-content whitespace-pre-line">{event.description}</div>

          {event.galleryImages.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display font-bold text-lg text-primary-950 mb-4">Photo Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {event.galleryImages.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="w-full aspect-square object-cover rounded-md border border-line" />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="rounded-lg border border-line bg-surface-muted p-6 space-y-5 sticky top-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-1">Date</p>
              <p className="text-sm font-medium text-primary-950">{formatDateRange(event.startDate, event.endDate)}</p>
            </div>
            {(event.startTime || event.endTime) && (
              <div className="flex gap-2.5">
                <Clock size={16} className="mt-0.5 text-primary-700 shrink-0" />
                <p className="text-sm text-ink">
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ""}
                </p>
              </div>
            )}
            <div className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 text-primary-700 shrink-0" />
              <p className="text-sm text-ink">{event.venue}</p>
            </div>
            {event.organizer && (
              <div className="flex gap-2.5">
                <User size={16} className="mt-0.5 text-primary-700 shrink-0" />
                <p className="text-sm text-ink">{event.organizer}</p>
              </div>
            )}
            {event.contactInfo && (
              <div className="flex gap-2.5">
                <Phone size={16} className="mt-0.5 text-primary-700 shrink-0" />
                <p className="text-sm text-ink">{event.contactInfo}</p>
              </div>
            )}

            {!isPast && event.registrationLink && (
              <a
                href={event.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-md bg-primary-800 text-white font-semibold py-2.5 text-sm hover:bg-primary-900 transition-colors"
              >
                Register <ExternalLink size={14} />
              </a>
            )}
            {event.externalLink && (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-md border border-primary-800 text-primary-800 font-semibold py-2.5 text-sm hover:bg-primary-50 transition-colors"
              >
                More Information <ExternalLink size={14} />
              </a>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
