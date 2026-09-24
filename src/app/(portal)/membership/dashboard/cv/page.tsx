import { Download, FileText, Lock } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getCv } from "@/lib/services/cv-service";
import { formatCedis, hasPaidFor, priceOf } from "@/lib/services/document-purchase-service";
import { cvHasSubstance } from "@/lib/validations/cv";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { CvForm } from "@/components/portal/CvForm";
import { PayForCvButton } from "@/components/portal/PayForCvButton";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "My CV" };
export const dynamic = "force-dynamic";

/**
 * A member's CV: fill it in here, pay once, download it as often as you
 * like afterwards.
 *
 * The form is open to everybody — somebody should be able to see what they
 * are buying, and write it, before being asked for money. It is the
 * finished PDF that is paid for.
 */
export default async function MemberCvPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const member = await requireMember();
  const { payment } = await searchParams;

  const [cv, paid] = await Promise.all([getCv(member.id), hasPaidFor(member.id, PaidDocumentKind.CV)]);
  const price = priceOf(PaidDocumentKind.CV);
  const ready = cvHasSubstance(cv);

  return (
    <>
      <PortalPageHeader
        title="My CV"
        description="Write it once here and the association turns it into a properly laid-out PDF you can send to employers."
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
          {paid ? "Your CV is ready to download" : `Download your CV — ${formatCedis(price.pesewas)}`}
        </h2>

        {paid ? (
          <>
            <p className="text-ink mt-2">
              Paid for. Change anything below and download it again whenever you like — there is nothing more to pay.
            </p>
            {ready ? (
              <p className="mt-4">
                <a href="/api/membership/cv" className={buttonClasses("primary", "md")}>
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
              One payment of {formatCedis(price.pesewas)}, and you can download your CV as many times as you need —
              every time you change it, for as long as you are a member.
            </p>
            <div className="mt-4">
              <PayForCvButton amount={formatCedis(price.pesewas)} />
            </div>
            <p className="mt-3 text-sm text-slate">
              You can also pay at the association office and ask them to record it against your name.
            </p>
          </>
        )}
      </section>

      <CvForm cv={cv} />
    </>
  );
}
