import type { Metadata } from "next";
import { HandHeart, Handshake, Mail, Quote, UserPlus } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClasses } from "@/components/ui/Button";
import { PortalNotice } from "@/components/portal/PortalNotice";
import { AllyShowcase, AllySignupForm } from "@/components/outreach/AllyForms";
import { DonateDialog } from "@/components/outreach/DonateDialog";
import { getAlliesPageSettings, getAlliesStats, listPublicAllies } from "@/lib/services/ally-service";
import { getSiteSettings } from "@/lib/services/content-service";
import { isPaystackConfigured } from "@/lib/services/paystack-client";

export const metadata: Metadata = {
  title: "Our Allies & Champions",
  description:
    "Meet the individuals and organisations powering our mission — and join our network of supporters dedicated to driving real change.",
};
export const dynamic = "force-dynamic";

const compact = new Intl.NumberFormat("en-GH", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Allies & Champions: the proof that the association doesn't stand alone,
 * and the easiest way in for anyone who'd like to stand with it — an email
 * address, no account.
 */
export default async function AlliesPage({ searchParams }: { searchParams: Promise<{ donation?: string }> }) {
  const [{ donation }, allies, stats, pageSettings, site] = await Promise.all([
    searchParams,
    listPublicAllies(),
    getAlliesStats(),
    getAlliesPageSettings(),
    getSiteSettings(),
  ]);
  const spotlight = allies.filter((a) => a.featured && a.spotlightQuote).slice(0, 3);
  const partnershipEmail = pageSettings.partnershipEmail || site.generalEmail;
  const onlineGiving = isPaystackConfigured();

  const tiles = [
    { label: "Corporate allies", value: stats.corporateAllies },
    { label: "Individual champions", value: stats.individualChampions },
    { label: "Campaigns supported", value: stats.campaignsSupported },
    {
      label: "Advocacy reach",
      value: stats.advocacyReach,
      note: "Students, graduates, patrons and allies who hear about our campaigns",
    },
  ];

  return (
    <div className="bg-surface-muted">
      {/* 1. Hero */}
      <section className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-500 text-primary-950 flex items-center justify-center mx-auto mb-5">
            <Handshake size={26} aria-hidden="true" />
          </div>
          <p className="kicker kicker-on-dark mb-2">Our Allies &amp; Champions</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-white text-balance leading-tight">
            Standing Together for Accessibility &amp; Inclusion
          </h1>
          <p className="mt-5 text-lg text-primary-100 leading-relaxed max-w-2xl mx-auto">
            Meet the individuals and organisations powering our mission — and join our network of supporters dedicated
            to driving real change.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#join" className={buttonClasses("secondary", "lg")}>
              <UserPlus size={18} aria-hidden="true" /> Become an Ally
            </a>
            <DonateDialog
              triggerLabel={
                <>
                  <HandHeart size={18} aria-hidden="true" /> Donate
                </>
              }
              triggerVariant="outlineOnDark"
              title="Support the association"
              intro="Choose a fund and an amount. You'll finish on Paystack's secure checkout."
              returnTo="allies"
              onlineEnabled={onlineGiving}
            />
          </div>
        </div>
      </section>

      {/* 2. Impact numbers */}
      <section aria-label="Our network in numbers" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-8">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl bg-white border border-line shadow-card p-5 text-center">
              <dt className="text-sm text-slate">{tile.label}</dt>
              <dd className="mt-1 font-sans font-semibold text-3xl sm:text-4xl text-primary-950">
                {compact.format(tile.value)}
              </dd>
              {tile.note && <dd className="mt-1 text-xs text-slate">{tile.note}</dd>}
            </div>
          ))}
        </dl>
      </section>

      {/* 3. Notable & proud allies */}
      <section aria-labelledby="showcase-heading" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16">
        <div id="showcase-heading">
          <SectionHeading kicker="With thanks" title="Notable & Proud Allies" align="center" />
        </div>
        <div className="mt-8">
          {allies.length > 0 ? (
            <AllyShowcase
              allies={allies.map((a) => ({
                id: a.id,
                type: a.type,
                name: a.name,
                imageUrl: a.imageUrl,
                role: a.role,
                organization: a.organization,
                sector: a.sector,
                statement: a.statement,
                websiteUrl: a.websiteUrl,
              }))}
            />
          ) : (
            <p className="text-center text-slate max-w-xl mx-auto">
              Our first allies are being added to this page. Join the network below — and tick the box if
              you&apos;d like to be among the first listed.
            </p>
          )}
        </div>
      </section>

      {/* 4. Join the ally network */}
      <section id="join" aria-labelledby="join-heading" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 scroll-mt-28">
        <div className="rounded-xl bg-white border border-line shadow-card p-6 sm:p-8">
          <h2 id="join-heading" className="font-display font-bold text-2xl text-primary-950">
            Join the Ally Network
          </h2>
          <p className="mt-2 text-slate leading-relaxed">
            You don&apos;t need a formal account to make a difference. Sign up with your email to receive periodic
            updates, advocacy alerts, and opportunities to support our initiatives.
          </p>
          <div className="mt-6">
            <AllySignupForm />
          </div>
        </div>
      </section>

      {/* 5. Ally spotlight */}
      {spotlight.length > 0 && (
        <section aria-labelledby="spotlight-heading" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16">
          <div id="spotlight-heading">
            <SectionHeading kicker="In their words" title="Why they stand with us" align="center" />
          </div>
          <ul className={`mt-8 grid gap-5 ${spotlight.length === 1 ? "max-w-2xl mx-auto" : spotlight.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {spotlight.map((ally) => (
              <li key={ally.id}>
                <figure className="h-full rounded-xl bg-primary-900 text-white p-6 sm:p-7 flex flex-col">
                  <Quote size={28} aria-hidden="true" className="text-accent-400" />
                  <blockquote className="mt-3 text-lg leading-relaxed flex-1">{ally.spotlightQuote}</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {ally.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ally.imageUrl}
                        alt=""
                        className={`w-11 h-11 shrink-0 ${ally.type === "CORPORATE" ? "rounded-md bg-[#ffffff] object-contain p-1" : "rounded-full object-cover"}`}
                      />
                    )}
                    <span>
                      <span className="block font-semibold">{ally.name}</span>
                      <span className="block text-sm text-primary-100">
                        {[ally.role, ally.organization ?? ally.sector].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Donate */}
      <section id="donate" aria-labelledby="donate-heading" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 scroll-mt-28">
        {donation === "success" && (
          <div className="mb-4">
            <PortalNotice tone="success">Thank you. Your gift has been received — a receipt is on its way to your email.</PortalNotice>
          </div>
        )}
        {donation === "failed" && (
          <div className="mb-4">
            <PortalNotice tone="danger">That payment didn&apos;t go through, and nothing was charged. You can try again below.</PortalNotice>
          </div>
        )}
        {donation === "error" && (
          <div className="mb-4">
            <PortalNotice tone="warning">We couldn&apos;t confirm that payment straight away. If you completed checkout, your receipt will follow shortly.</PortalNotice>
          </div>
        )}
        <div className="rounded-xl border border-accent-400 bg-accent-100 text-primary-950 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <h2 id="donate-heading" className="font-display font-bold text-2xl">
              Give to the cause
            </h2>
            <p className="mt-1.5 leading-relaxed">
              Every gift goes to students with special needs at the university — assistive technology, emergency
              welfare, or the campaigns that change the rules for everyone.
            </p>
          </div>
          <DonateDialog
            triggerLabel={
              <>
                <HandHeart size={18} aria-hidden="true" /> Donate Now
              </>
            }
            triggerVariant="primary"
            title="Support the association"
            intro="Choose a fund and an amount. You'll finish on Paystack's secure checkout."
            returnTo="allies"
            onlineEnabled={onlineGiving}
          />
        </div>
      </section>

      {/* 6. Partnership callout */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-[17px] text-ink leading-relaxed">
            Represent a corporate body interested in a strategic partnership?
            {partnershipEmail ? (
              <>
                {" "}
                Reach out directly to our advocacy team at{" "}
                <a
                  href={`mailto:${partnershipEmail}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600 underline"
                >
                  <Mail size={15} aria-hidden="true" /> {partnershipEmail}
                </a>
                .
              </>
            ) : (
              <>
                {" "}
                <a href="/contact?subject=Strategic%20partnership" className="font-semibold text-primary-800 hover:text-accent-600 underline">
                  Reach out to our advocacy team
                </a>
                .
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
