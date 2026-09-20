import type { Metadata } from "next";
import { HandHeart, HardDrive, KeyRound, LifeBuoy, Mail, PiggyBank, SendHorizontal, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClasses } from "@/components/ui/Button";
import { PortalNotice } from "@/components/portal/PortalNotice";
import { DonateDialog } from "@/components/outreach/DonateDialog";
import { TechDirectory, TechRequestForm } from "@/components/outreach/TechDirectory";
import { getAssistiveTechSettings, listPublicSoftware } from "@/lib/services/assistive-software-service";
import { listPublicTutorials } from "@/lib/services/tutorial-service";
import { isPaystackConfigured } from "@/lib/services/paystack-client";
import { getCurrentMember } from "@/lib/auth/member";
import { formatFullName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tech & Tutorials",
  description:
    "Assistive software, screen readers and step-by-step video tutorials for students with special needs — and a way to ask for the tool or walk-through you need.",
};
export const dynamic = "force-dynamic";

const TECH_FUND = "ASSISTIVE_TECHNOLOGY";

/**
 * Tech & Tutorials: what is in the association's Telegram software library,
 * the video walk-throughs that show how to use it, how to ask for either
 * when what you need is missing — and how to pay for the licences that
 * aren't free.
 */
export default async function TechTutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const [{ donation }, software, tutorials, settings, member] = await Promise.all([
    searchParams,
    listPublicSoftware(),
    listPublicTutorials(),
    getAssistiveTechSettings(),
    getCurrentMember().catch(() => null),
  ]);
  const onlineGiving = isPaystackConfigured();
  const libraryUrl = settings.telegramUrl || null;

  const tiers = [
    {
      key: "licence",
      icon: KeyRound,
      title: "Sponsor a licence",
      text: "Pay for one student's licence for specialised screen-reading or captioning software.",
      preset: settings.licenceTierCedis,
      cta: `Give GH₵ ${settings.licenceTierCedis.toLocaleString("en-GH")}`,
    },
    {
      key: "hardware",
      icon: HardDrive,
      title: "Hardware & tools",
      text: "Contribute toward physical adaptive devices and assistive equipment.",
      preset: settings.hardwareTierCedis,
      cta: `Give GH₵ ${settings.hardwareTierCedis.toLocaleString("en-GH")}`,
    },
    {
      key: "custom",
      icon: PiggyBank,
      title: "Any amount",
      text: "Give whatever you can to the general Assistive Technology Acquisition Fund.",
      preset: undefined,
      cta: "Choose an amount",
    },
  ];

  return (
    <div className="bg-surface-muted">
      {/* 1. Hero */}
      <section className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="kicker kicker-on-dark mb-2">Tech &amp; Tutorials</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-white text-balance leading-tight">
            Empowering Access Through Technology
          </h1>
          <p className="mt-5 text-lg text-primary-100 leading-relaxed max-w-2xl mx-auto">
            Assistive software and screen readers for vision, hearing, cognitive and mobility access — and short video
            tutorials showing how to use them.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {libraryUrl ? (
              <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg")}>
                <SendHorizontal size={18} aria-hidden="true" /> Access Telegram Software Library
                <span className="sr-only"> (opens Telegram in a new tab)</span>
              </a>
            ) : (
              <a href="#directory" className={buttonClasses("secondary", "lg")}>
                <SendHorizontal size={18} aria-hidden="true" /> Browse the Software
              </a>
            )}
            <a
              href="#donate"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white text-white font-semibold text-base px-6 py-3 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <HandHeart size={18} aria-hidden="true" /> Donate for Software &amp; Tools
            </a>
          </div>
          <p className="mt-5">
            <a href="#request" className="text-sm font-semibold text-accent-400 hover:text-accent-200 underline">
              Request software or a tutorial
            </a>
          </p>
        </div>
      </section>

      {/* 2. Donate */}
      <section id="donate" aria-labelledby="donate-heading" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-14 scroll-mt-28">
        {donation === "success" && (
          <div className="mb-5">
            <PortalNotice tone="success">
              Thank you. Your gift has been received — a receipt is on its way to your email.
            </PortalNotice>
          </div>
        )}
        {donation === "failed" && (
          <div className="mb-5">
            <PortalNotice tone="danger">That payment didn&apos;t go through, and nothing was charged. You can try again below.</PortalNotice>
          </div>
        )}
        {donation === "error" && (
          <div className="mb-5">
            <PortalNotice tone="warning">
              We couldn&apos;t confirm that payment straight away. If you completed checkout, your receipt will follow shortly.
            </PortalNotice>
          </div>
        )}

        <div id="donate-heading">
          <SectionHeading
            kicker="Sponsor access"
            title="Help Us Provide Premium Assistive Software"
            description="Many essential screen readers, magnification tools, and voice recognition applications require paid premium licences. Your donations directly purchase software keys, subscription licences, and adaptive hardware for students with special needs who cannot afford them."
            align="center"
          />
        </div>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {tiers.map(({ key, icon: Icon, title, text, preset, cta }) => (
            <li key={key} className="bg-white rounded-xl border border-line shadow-card p-6 flex flex-col">
              <span aria-hidden="true" className="w-12 h-12 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-display font-bold text-lg text-primary-950">{title}</h3>
              <p className="mt-1.5 text-[15px] text-slate leading-relaxed flex-1">{text}</p>
              <div className="mt-5">
                <DonateDialog
                  triggerLabel={cta}
                  triggerVariant="outline"
                  triggerSize="md"
                  triggerClassName="w-full"
                  title={title}
                  intro="Your gift goes to the Assistive Technology & Devices Fund."
                  returnTo="tech-tutorials"
                  fixedFund={TECH_FUND}
                  presetCedis={preset}
                  onlineEnabled={onlineGiving}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <DonateDialog
            triggerLabel={
              <>
                <HandHeart size={18} aria-hidden="true" /> Donate Now to Support Tech Access
              </>
            }
            triggerVariant="primary"
            title="Support tech access"
            intro="Your gift goes to the Assistive Technology & Devices Fund."
            returnTo="tech-tutorials"
            fixedFund={TECH_FUND}
            onlineEnabled={onlineGiving}
          />
        </div>
      </section>

      {/* 3. The directory */}
      <section id="directory" aria-labelledby="directory-heading" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 scroll-mt-28">
        <div id="directory-heading">
          <SectionHeading
            kicker="The directory"
            title="Software & Tutorials"
            description="Downloads from the association's Telegram library, and walk-throughs on YouTube and TikTok. Use the tabs to narrow it down."
          />
        </div>
        <div className="mt-8">
          {software.length === 0 && tutorials.length === 0 ? (
            <p className="text-slate">
              The directory is being put together. In the meantime, the Telegram library has everything the technical
              team has shared so far — or ask for what you need below.
            </p>
          ) : (
            <TechDirectory
              software={software.map((s) => ({
                id: s.id,
                name: s.name,
                logoUrl: s.logoUrl,
                category: s.category,
                platforms: s.platforms,
                description: s.description,
                isFree: s.isFree,
                telegramUrl: s.telegramUrl,
              }))}
              tutorials={tutorials.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                source: t.source,
                url: t.url,
                videoId: t.videoId,
                thumbnailUrl: t.thumbnailUrl,
                category: t.category,
                durationLabel: t.durationLabel,
              }))}
              libraryUrl={libraryUrl}
            />
          )}
        </div>
      </section>

      {/* 4. Telegram bridge */}
      <section aria-labelledby="telegram-heading" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16">
        <div className="rounded-xl bg-primary-900 text-white p-6 sm:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <span aria-hidden="true" className="w-16 h-16 rounded-full bg-accent-500 text-primary-950 flex items-center justify-center shrink-0">
            <SendHorizontal size={28} />
          </span>
          <div className="flex-1">
            {/* Stated, not inherited: headings are given the dark ink colour
                globally, which wins over the panel's white text. */}
            <h2 id="telegram-heading" className="font-display font-bold text-2xl text-white">
              Join Our Central Software Repository on Telegram
            </h2>
            <p className="mt-2 text-primary-100 leading-relaxed">
              Our Telegram channel is continuously updated with full software packages, installation guides, updates,
              and setup support managed directly by our technical team.
            </p>
          </div>
          {libraryUrl ? (
            <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg", "shrink-0")}>
              Open Telegram Repository<span className="sr-only"> (opens Telegram in a new tab)</span>
            </a>
          ) : (
            <p className="text-sm text-primary-100 shrink-0">The channel link is coming soon.</p>
          )}
        </div>
      </section>

      {/* 5. Request form */}
      <section id="request" aria-labelledby="request-heading" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 scroll-mt-28">
        <div className="rounded-xl bg-white border border-line shadow-card p-6 sm:p-8">
          <h2 id="request-heading" className="font-display font-bold text-2xl text-primary-950">
            Can&apos;t Find What You Need?
          </h2>
          <p className="mt-2 text-slate leading-relaxed">
            Ask for a tool that isn&apos;t in the Telegram library yet, or for a walk-through of something you are stuck
            on. Paid software is bought with donated funds where we can; tutorials are recorded and posted here.
          </p>
          <div className="mt-6">
            <TechRequestForm
              defaults={
                member
                  ? { fullName: formatFullName(member.firstName, member.middleName, member.lastName), email: member.email }
                  : undefined
              }
            />
          </div>
        </div>
      </section>

      {/* 6. Support & transparency */}
      <section aria-label="Technical support and transparency" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-white border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
              <LifeBuoy size={19} aria-hidden="true" className="text-primary-800" /> Need help setting it up?
            </h2>
            <p className="mt-2 text-[15px] text-slate leading-relaxed">
              Reach out to our technical team
              {libraryUrl && (
                <>
                  {" "}
                  via{" "}
                  <a href={libraryUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-800 underline">
                    Telegram
                  </a>
                </>
              )}
              {settings.supportEmail ? (
                <>
                  {libraryUrl ? " or " : " at "}
                  <a
                    href={`mailto:${settings.supportEmail}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary-800 underline"
                  >
                    <Mail size={14} aria-hidden="true" /> {settings.supportEmail}
                  </a>
                </>
              ) : (
                !libraryUrl && (
                  <>
                    {" "}
                    through the{" "}
                    <a href="/contact?subject=Assistive%20software%20help" className="font-semibold text-primary-800 underline">
                      Contact page
                    </a>
                  </>
                )
              )}
              .
            </p>
          </div>
          <div className="rounded-xl border border-accent-400 bg-accent-100 text-primary-950 p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-lg">
              <ShieldCheck size={19} aria-hidden="true" /> Where your gift goes
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed">
              100% of tech donations go directly toward acquiring licensed software, assistive tools, and technical
              support resources for students with special needs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
