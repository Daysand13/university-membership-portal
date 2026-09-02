import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getAboutContent, getActiveTeamMembers, getSiteSettings } from "@/lib/services/content-service";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="py-8 border-b border-line last:border-0">
      <h2 className="font-display font-bold text-xl text-primary-950 mb-3">{title}</h2>
      <div className="prose-content whitespace-pre-line">{content}</div>
    </div>
  );
}

function PersonCard({ name, position, photoUrl, bio }: { name: string; position: string; photoUrl: string | null; bio: string | null }) {
  return (
    <div className="bg-white rounded-lg border border-line p-5 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-muted border border-line overflow-hidden mx-auto mb-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <p className="font-display font-bold text-sm text-primary-950">{name}</p>
      <p className="text-xs text-accent-600 font-semibold mt-0.5">{position}</p>
      {bio && <p className="text-xs text-slate leading-relaxed mt-2">{bio}</p>}
    </div>
  );
}

export default async function AboutPage() {
  const [about, patrons, leadership, settings] = await Promise.all([
    getAboutContent(),
    getActiveTeamMembers("PATRON"),
    getActiveTeamMembers("LEADERSHIP"),
    getSiteSettings(),
  ]);

  const hasAnyContent = [
    about.mission,
    about.vision,
    about.history,
    about.coreValues,
    about.objectives,
    about.membershipEligibility,
    about.partnersStakeholders,
  ].some(Boolean);

  const hasContactInfo = !!(settings.physicalAddress || settings.phonePrimary || settings.generalEmail);

  return (
    <div className="bg-white">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <SectionHeading kicker="Who We Are" title="About the Association" align="center" onDark />
        </div>
      </div>

      {about.imageUrl && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="w-full max-h-[420px] rounded-lg shadow-md border border-line bg-surface-muted overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={about.imageUrl}
              alt="Acme University Students' Association"
              className="w-full max-h-[420px] object-contain"
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {hasAnyContent ? (
          <>
            <Section title="Mission Statement" content={about.mission} />
            <Section title="Vision Statement" content={about.vision} />
            <Section title="Our History and Background" content={about.history} />
            <Section title="Core Values" content={about.coreValues} />
          </>
        ) : (
          <p className="text-slate text-center py-12">
            Content for this page hasn&apos;t been added yet — an administrator can publish the mission, vision,
            and history from the Admin dashboard.
          </p>
        )}

        {patrons.length > 0 && (
          <div className="py-8 border-b border-line">
            <h2 className="font-display font-bold text-xl text-primary-950 mb-5">Our Patrons</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {patrons.map((p) => (
                <PersonCard key={p.id} name={p.name} position={p.position} photoUrl={p.photoUrl} bio={p.bio} />
              ))}
            </div>
          </div>
        )}

        {(leadership.length > 0 || about.leadershipMessage) && (
          <div className="py-8 border-b border-line">
            <h2 className="font-display font-bold text-xl text-primary-950 mb-3">Executive Leadership and Team</h2>
            {about.leadershipMessage && (
              <p className="prose-content whitespace-pre-line mb-5">{about.leadershipMessage}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {leadership.map((l) => (
                <PersonCard key={l.id} name={l.name} position={l.position} photoUrl={l.photoUrl} bio={l.bio} />
              ))}
            </div>
          </div>
        )}

        <Section title="Objectives and Goals" content={about.objectives} />
        <Section title="Membership Eligibility and Categories" content={about.membershipEligibility} />
        <Section title="Partners and Stakeholders" content={about.partnersStakeholders} />

        {hasContactInfo && (
          <div className="py-8">
            <h2 className="font-display font-bold text-xl text-primary-950 mb-4">Contact Information and Location</h2>
            <div className="space-y-2.5 text-sm text-slate">
              {settings.physicalAddress && (
                <p className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-primary-700 shrink-0 mt-0.5" /> {settings.physicalAddress}
                </p>
              )}
              {settings.phonePrimary && (
                <p className="flex items-center gap-2.5">
                  <Phone size={16} className="text-primary-700 shrink-0" /> {settings.phonePrimary}
                </p>
              )}
              {settings.generalEmail && (
                <p className="flex items-center gap-2.5">
                  <Mail size={16} className="text-primary-700 shrink-0" /> {settings.generalEmail}
                </p>
              )}
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary-800 hover:text-accent-600"
            >
              Full contact details <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
