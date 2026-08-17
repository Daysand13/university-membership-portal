import type { Metadata } from "next";
import { HandHeart, Landmark, Smartphone, Mail } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDonateContent } from "@/lib/services/content-service";

export const metadata: Metadata = { title: "Donate" };
export const dynamic = "force-dynamic";

export default async function DonatePage() {
  const donate = await getDonateContent();

  return (
    <div className="bg-white">
      <div className="bg-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <HandHeart size={30} className="mx-auto text-accent-400 mb-4" />
          <SectionHeading
            kicker="Support Our Work"
            title={donate.title || "Donate to the Association"}
            align="center"
            onDark
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
        {donate.description && (
          <p className="text-slate leading-relaxed text-center max-w-xl mx-auto whitespace-pre-line">
            {donate.description}
          </p>
        )}

        {donate.instructions && (
          <div className="mt-8 rounded-lg border border-line bg-surface-muted p-6">
            <p className="text-sm text-ink whitespace-pre-line">{donate.instructions}</p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {donate.bankDetails && (
            <div className="rounded-lg border border-line p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <Landmark size={18} className="text-primary-800" />
                <h3 className="font-display font-bold text-base text-primary-950">Bank Transfer</h3>
              </div>
              <p className="text-sm text-slate whitespace-pre-line font-data">{donate.bankDetails}</p>
            </div>
          )}
          {donate.mobileMoneyDetails && (
            <div className="rounded-lg border border-line p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <Smartphone size={18} className="text-primary-800" />
                <h3 className="font-display font-bold text-base text-primary-950">Mobile Money</h3>
              </div>
              <p className="text-sm text-slate whitespace-pre-line font-data">{donate.mobileMoneyDetails}</p>
            </div>
          )}
        </div>

        {donate.qrCodeImageUrl && (
          <div className="mt-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={donate.qrCodeImageUrl}
              alt="Donation QR code"
              className="w-44 h-44 mx-auto rounded-lg border border-line p-2"
            />
            <p className="text-xs text-slate mt-2">Scan to donate</p>
          </div>
        )}

        {donate.paymentGatewayUrl && (
          <div className="mt-8 text-center">
            <a
              href={donate.paymentGatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-accent-500 text-primary-950 font-semibold px-6 py-3 text-sm hover:bg-accent-600 transition-colors"
            >
              Donate Online
            </a>
          </div>
        )}

        {donate.contactInfo && (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate">
            <Mail size={15} /> Questions about giving? {donate.contactInfo}
          </div>
        )}

        {!donate.description && !donate.bankDetails && !donate.mobileMoneyDetails && !donate.qrCodeImageUrl && (
          <p className="text-center text-slate py-8">
            Donation details haven&apos;t been added yet — an administrator can publish giving instructions from
            the Admin dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
