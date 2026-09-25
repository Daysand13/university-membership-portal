import Link from "next/link";
import { Download, IdCard, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { idCardValidUntil } from "@/lib/id-card/id-card-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "My ID Card" };
export const dynamic = "force-dynamic";

/**
 * A member's association ID card, on their own dashboard.
 *
 * It only appears once dues are paid, because that is what the card
 * certifies — a card for somebody who has not paid would say something
 * untrue on the front of it. Until then the page says so plainly, and
 * says where to go about it, rather than hiding.
 */
export default async function MemberIdCardPage() {
  const member = await requireMember();
  const academicYear = getCurrentAcademicYear();
  const paid = await hasPaidDuesForYear(member.id, academicYear);

  return (
    <>
      <PortalPageHeader
        title="My ID Card"
        description="Your association membership card, to show at events and at the association office."
      />

      {!paid ? (
        <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 max-w-2xl">
          <h2 className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
            <Lock size={20} aria-hidden="true" /> Your card is issued once your dues are paid
          </h2>
          <p className="text-ink mt-2">
            The card certifies that you are a paid-up member for {academicYear}, so it can only be issued once that is
            true. Pay your dues and it appears here straight away.
          </p>
          <p className="mt-5">
            <Link href="/membership/dashboard/dues" className={buttonClasses("primary", "md")}>
              Go to Dues &amp; Payments
            </Link>
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
              <IdCard size={20} aria-hidden="true" /> Paid up for {academicYear}
            </h2>
            <p className="text-ink mt-2">
              This card is valid until {idCardValidUntil()}. The QR code on the back is what an officer scans to check
              it — it always reports your standing as it is today, not as it was when the card was printed.
            </p>
            <p className="mt-4">
              <a href="/api/membership/id-card?format=pdf" className={buttonClasses("primary", "md")}>
                <Download size={16} aria-hidden="true" /> Download my card (PDF, both sides)
              </a>
            </p>
          </section>

          <section aria-labelledby="card-preview-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
            <h2 id="card-preview-heading" className="font-display font-bold text-lg text-primary-950 mb-1">
              What it looks like
            </h2>
            <p className="text-sm text-slate mb-4">
              Printed at card size. The details come from your membership record — if anything on it is wrong, correct
              it under Account Settings and download the card again.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {(["front", "back"] as const).map((side) => (
                <figure key={side} className="m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- rendered on demand, not a static asset */}
                  <img
                    src={`/api/membership/id-card?side=${side}`}
                    alt={`The ${side} of your membership card`}
                    className="w-full rounded-lg border border-line shadow-sm"
                  />
                  <figcaption className="text-xs text-slate mt-1.5 capitalize">{side}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
