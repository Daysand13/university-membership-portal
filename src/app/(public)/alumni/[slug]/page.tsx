import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Briefcase, MapPin, GraduationCap, Award, Quote } from "lucide-react";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { getPublicAlumnusBySlug } from "@/lib/services/alumni-showcase-service";
import { getSiteSettings } from "@/lib/services/content-service";

export const dynamic = "force-dynamic";

/**
 * Public profile for one alumnus.
 *
 * Everything rendered here comes from getPublicAlumnusBySlug, which selects
 * only showcase fields — email, phone and index number are not in that
 * payload at all, so they cannot reach this page even by mistake. A profile
 * that isn't public simply doesn't resolve, which is why this 404s rather
 * than rendering an "unavailable" page: an unpublished profile shouldn't
 * confirm that the person exists.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const alumnus = await getPublicAlumnusBySlug(slug);
  if (!alumnus) return { title: "Alumni profile" };

  const settings = await getSiteSettings();
  const role = [alumnus.currentPosition ?? alumnus.profession, alumnus.currentOrganization]
    .filter(Boolean)
    .join(" at ");
  const description =
    alumnus.spotlight?.summary ??
    alumnus.bio ??
    `${alumnus.fullName}, Class of ${alumnus.graduationYear}${role ? ` — ${role}` : ""}.`;
  const image = alumnus.spotlight?.imageUrl ?? alumnus.profileImageUrl;

  return {
    title: alumnus.fullName,
    description,
    alternates: { canonical: `/alumni/${slug}` },
    openGraph: {
      title: `${alumnus.fullName} · ${settings.siteTitle}`,
      description,
      type: "profile",
      url: `/alumni/${slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

/** Reuses the site's existing social glyphs rather than a second icon set. */
const SOCIALS = [
  { key: "linkedinUrl", label: "LinkedIn", platform: "LINKEDIN" },
  { key: "twitterUrl", label: "X", platform: "TWITTER" },
  { key: "facebookUrl", label: "Facebook", platform: "FACEBOOK" },
  { key: "instagramUrl", label: "Instagram", platform: "INSTAGRAM" },
  { key: "websiteUrl", label: "Website", platform: "CUSTOM" },
] as const;

export default async function AlumniProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alumnus = await getPublicAlumnusBySlug(slug);
  if (!alumnus) notFound();

  const image = alumnus.spotlight?.imageUrl ?? alumnus.profileImageUrl;
  const role = alumnus.currentPosition ?? alumnus.profession;
  const place = alumnus.currentLocation ?? alumnus.country;
  const links = SOCIALS.filter((s) => alumnus[s.key]);

  return (
    <div className="bg-surface-muted min-h-[70vh]">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/alumni"
            className="inline-flex items-center gap-1.5 text-sm text-primary-200 hover:text-accent-400 mb-8"
          >
            <ArrowLeft size={15} /> Our Proud Alumni
          </Link>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7 text-center sm:text-left">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center text-primary-300 shrink-0">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={alumnus.fullName} className="w-full h-full object-cover" />
              ) : (
                <User size={48} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {alumnus.spotlight?.category && (
                <p className="kicker text-accent-400">{alumnus.spotlight.category}</p>
              )}
              <h1 className="font-display font-bold text-3xl sm:text-4xl mt-2 text-balance">
                {alumnus.fullName}
              </h1>
              {alumnus.spotlight?.headline && (
                <p className="text-accent-200 mt-2 text-base sm:text-lg leading-snug">
                  {alumnus.spotlight.headline}
                </p>
              )}

              <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-start gap-x-6 gap-y-2 text-sm text-primary-100">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-accent-400 shrink-0" />
                  Class of {alumnus.graduationYear} · {alumnus.programme}
                </span>
                {(role || alumnus.currentOrganization) && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={15} className="text-accent-400 shrink-0" />
                    {role}
                    {role && alumnus.currentOrganization ? " at " : ""}
                    {alumnus.currentOrganization}
                  </span>
                )}
                {place && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-accent-400 shrink-0" /> {place}
                  </span>
                )}
              </div>

              {links.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-2.5">
                  {links.map(({ key, label, platform }) => (
                    <a
                      key={key}
                      href={alumnus[key] as string}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                    >
                      <SocialIcon platform={platform} /> {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {alumnus.spotlight?.quote && (
              <blockquote className="rounded-lg border-l-4 border-accent-500 bg-white p-6">
                <Quote size={20} className="text-accent-500 mb-3" />
                <p className="font-display text-lg text-primary-950 leading-relaxed italic">
                  {alumnus.spotlight.quote}
                </p>
              </blockquote>
            )}

            {(alumnus.spotlight?.story || alumnus.bio) && (
              <div className="bg-white rounded-lg border border-line p-6 sm:p-8">
                <h2 className="font-display font-bold text-lg text-primary-950 mb-4">
                  {alumnus.spotlight?.story ? "Their story" : "About"}
                </h2>
                <div className="text-slate leading-relaxed whitespace-pre-line">
                  {alumnus.spotlight?.story ?? alumnus.bio}
                </div>
              </div>
            )}

            {alumnus.achievements.length > 0 && (
              <div className="bg-white rounded-lg border border-line p-6 sm:p-8">
                <h2 className="font-display font-bold text-lg text-primary-950 mb-4">Achievements</h2>
                <ul className="space-y-3">
                  {alumnus.achievements.map((achievement) => (
                    <li key={achievement} className="flex gap-2.5 text-sm text-ink">
                      <Award size={16} className="text-accent-600 shrink-0 mt-0.5" />
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-lg border border-line p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">At a glance</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-light text-xs">Graduated</dt>
                  <dd className="text-ink">{alumnus.graduationYear}</dd>
                </div>
                <div>
                  <dt className="text-slate-light text-xs">Programme</dt>
                  <dd className="text-ink">{alumnus.programme}</dd>
                </div>
                {alumnus.industry && (
                  <div>
                    <dt className="text-slate-light text-xs">Industry</dt>
                    <dd className="text-ink">{alumnus.industry}</dd>
                  </div>
                )}
                {alumnus.currentOrganization && (
                  <div>
                    <dt className="text-slate-light text-xs">Organisation</dt>
                    <dd className="text-ink">{alumnus.currentOrganization}</dd>
                  </div>
                )}
                {place && (
                  <div>
                    <dt className="text-slate-light text-xs">Based in</dt>
                    <dd className="text-ink">{place}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-primary-950 text-white rounded-lg p-6">
              <p className="font-display font-bold text-base">Are you an alumnus too?</p>
              <p className="text-xs text-primary-200 mt-1.5 leading-relaxed">
                Join the community and stay connected with the association.
              </p>
              <Link
                href="/alumni/register"
                className="mt-4 inline-flex items-center rounded-md bg-accent-500 px-4 py-2 text-xs font-semibold text-primary-950 hover:bg-accent-400"
              >
                Register New Account
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
