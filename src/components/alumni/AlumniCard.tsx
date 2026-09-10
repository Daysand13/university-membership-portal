import Link from "next/link";
import { User, Briefcase, MapPin, ArrowRight } from "lucide-react";
import type { PublicAlumnus } from "@/lib/services/alumni-showcase-service";

/**
 * One featured alumnus, as a spotlight card.
 *
 * Every field below the name is optional and simply omitted when absent —
 * some graduates will have a full professional history on file and others
 * only a name and a class year, and a card with gaps should still look
 * deliberate rather than broken.
 */
export function AlumniCard({ alumnus }: { alumnus: PublicAlumnus }) {
  const image = alumnus.spotlight?.imageUrl ?? alumnus.profileImageUrl;
  const role = alumnus.currentPosition ?? alumnus.profession;
  const org = alumnus.currentOrganization;
  const place = alumnus.currentLocation ?? alumnus.country;
  const blurb = alumnus.spotlight?.summary ?? alumnus.bio;

  return (
    <article className="group flex flex-col bg-white rounded-lg border border-line overflow-hidden hover:border-primary-600 hover:shadow-[var(--shadow-card-hover)] transition-all">
      <div className="aspect-[4/3] bg-primary-50 overflow-hidden flex items-center justify-center text-primary-300">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={alumnus.fullName}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <User size={44} />
        )}
      </div>

      <div className="flex-1 flex flex-col p-5">
        {alumnus.spotlight?.category && (
          <p className="kicker text-accent-700 mb-2">{alumnus.spotlight.category}</p>
        )}

        <h3 className="font-display font-bold text-lg text-primary-950 leading-snug">{alumnus.fullName}</h3>
        <p className="text-xs text-slate-light mt-1">
          Class of {alumnus.graduationYear} · {alumnus.programme}
        </p>

        {(role || org) && (
          <p className="flex items-start gap-1.5 text-sm text-ink mt-3">
            <Briefcase size={14} className="text-primary-700 shrink-0 mt-0.5" />
            <span>
              {role}
              {role && org ? " at " : ""}
              {org && <span className="font-semibold">{org}</span>}
            </span>
          </p>
        )}

        {place && (
          <p className="flex items-center gap-1.5 text-xs text-slate mt-1.5">
            <MapPin size={13} className="text-slate-light shrink-0" /> {place}
          </p>
        )}

        {blurb && <p className="text-sm text-slate leading-relaxed mt-3 line-clamp-3">{blurb}</p>}

        {alumnus.publicSlug && (
          <Link
            href={`/alumni/${alumnus.publicSlug}`}
            className="mt-4 pt-3 border-t border-line inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
          >
            View profile <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
