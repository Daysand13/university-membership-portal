import { Download, FileText, Lock } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getCv } from "@/lib/services/cv-service";
import { hasPaidFor, paidUntil, priceDescription } from "@/lib/services/document-purchase-service";
import { cvHasSubstance } from "@/lib/validations/cv";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CvForm } from "@/components/portal/CvForm";
import { PayForCvButton } from "@/components/portal/PayForCvButton";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "My CV" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * A graduate's CV.
 *
 * The same document as a student's, renewed yearly rather than bought
 * once: a graduate is no longer paying dues, and the association goes on
 * preparing this for them long after they have left.
 */
export default async function AlumniCvPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const alumnus = await requireAlumni();
  const { payment } = await searchParams;

  const owner = { kind: "alumni" as const, id: alumnus.id, email: alumnus.email };
  const [cv, paid, until] = await Promise.all([
    getCv({ kind: "alumni", id: alumnus.id }),
    hasPaidFor(owner, PaidDocumentKind.CV),
    paidUntil(owner, PaidDocumentKind.CV),
  ]);
  const price = priceDescription("alumni", PaidDocumentKind.CV);
  const ready = cvHasSubstance(cv);

  return (
    <>
      <PortalPageHeader
        title="My CV"
        description="Write it here and the association turns it into a properly laid-out PDF you can send to employers."
      />

      {payment && (
        <p role="status" className="mb-6 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm text-ink">
          {payment}
        </p>
      )}

      <section
        aria-labelledby="cv-download-heading"
        className={`mb-6 rounded-xl border p-5 sm:p-6 ${paid ? "border-success bg-success-light/40" : "border-line bg-white shadow-card"}`}
      >
        <h2 id="cv-download-heading" className="flex items-center gap-2 font-display font-bold text-lg text-primary-950">
          {paid ? <FileText size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
          {paid ? "Your CV is ready to download" : `Download your CV — ${price}`}
        </h2>

        {paid ? (
          <>
            <p className="text-ink mt-2">
              Paid up{until ? ` until ${dateFormat.format(until)}` : ""}. Change anything below and download it again
              as often as you like until then.
            </p>
            {ready ? (
              <p className="mt-4">
                <a href="/api/alumni/cv" className={buttonClasses("primary", "md")}>
                  <Download size={16} aria-hidden="true" /> Download my CV (PDF)
                </a>
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate">
                Fill in at least a profile or one school below, then come back and download it.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-ink mt-2">
              {price}. Graduates renew each year — you are no longer paying dues, and the association goes on keeping
              this for you. Download it as often as you need in between.
            </p>
            <div className="mt-4">
              <PayForCvButton amount={price} portal="alumni" />
            </div>
            <p className="mt-3 text-sm text-slate">
              You can also pay at the association office and ask them to record it against your name.
            </p>
          </>
        )}
      </section>

      <CvForm cv={cv} portal="alumni" />
    </>
  );
}
