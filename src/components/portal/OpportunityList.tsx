import { Building2, CalendarClock, ExternalLink, Mail, MapPin } from "lucide-react";
import { opportunityTypeLabel } from "@/lib/portal-options";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export interface OpportunityItem {
  id: string;
  title: string;
  organization: string;
  type: string;
  location: string | null;
  description: string;
  applyUrl: string | null;
  applyEmail: string | null;
  closingDate: Date | null;
  postedByName: string;
  createdAt: Date;
}

/**
 * The opportunity board, as students and graduates both see it.
 *
 * Every posting is one a graduate of the association put up and an
 * administrator checked — which is worth saying on the page, because the
 * alternative most of these students face is job boards that have never
 * heard of accessibility.
 */
export function OpportunityList({ items }: { items: OpportunityItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <p className="font-display font-bold text-base text-primary-950 break-words min-w-0">{item.title}</p>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800 shrink-0">
              {opportunityTypeLabel(item.type)}
            </span>
          </div>

          <p className="text-sm text-slate mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} aria-hidden="true" /> {item.organization}
            </span>
            {item.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" /> {item.location}
              </span>
            )}
            {item.closingDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={13} aria-hidden="true" /> Closes {dateFormat.format(item.closingDate)}
              </span>
            )}
          </p>

          <p className="text-[15px] text-ink mt-2.5 whitespace-pre-line leading-relaxed">{item.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {item.applyUrl && (
              <a
                href={item.applyUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600 py-1"
              >
                <ExternalLink size={14} aria-hidden="true" /> Apply
                <span className="sr-only"> for {item.title} (opens in a new tab)</span>
              </a>
            )}
            {item.applyEmail && (
              <a
                href={`mailto:${item.applyEmail}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600 py-1"
              >
                <Mail size={14} aria-hidden="true" /> {item.applyEmail}
              </a>
            )}
            <span className="text-xs text-slate">Posted by {item.postedByName}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
