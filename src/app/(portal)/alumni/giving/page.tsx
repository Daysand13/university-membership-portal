import Link from "next/link";
import { HandHeart, HeartHandshake, History, Sparkles } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { isPaystackConfigured } from "@/lib/services/paystack-client";
import { getGivingImpact, getGivingSummary, listGivingForAlumni } from "@/lib/services/alumni-giving-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalNotice } from "@/components/portal/PortalNotice";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { AlumniGivingForm } from "@/components/alumni-portal/Forms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { donationFundLabel, formatCedis } from "@/lib/patron-portal-options";

export const metadata = { title: "Donations & Giving" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * Alumni giving: the gift, the record of what this graduate has given, and
 * an honest account of what the funds actually did for students in the last
 * year.
 */
export default async function AlumniGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const alumni = await requireAlumni();
  const [{ donation }, gifts, summary, impact] = await Promise.all([
    searchParams,
    listGivingForAlumni(alumni.id),
    getGivingSummary(alumni.id),
    getGivingImpact(),
  ]);

  return (
    <>
      <PortalPageHeader
        title="Donations & Giving"
        description="Every cedi goes to students at this university who are studying with a disability. You choose which fund."
      />

      {donation === "success" && (
        <PortalNotice tone="success">
          Thank you. Your gift has been received and a receipt is on its way to your email.
        </PortalNotice>
      )}
      {donation === "failed" && (
        <PortalNotice tone="danger">
          That payment didn&apos;t go through, and nothing has been charged. You can try again below.
        </PortalNotice>
      )}
      {donation === "error" && (
        <PortalNotice tone="warning">
          We couldn&apos;t confirm that payment right away. If you completed checkout it will appear here shortly.
        </PortalNotice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start mt-6">
        <DashboardCard id="give" title="Give to the Association" icon={<HandHeart size={20} />}>
          {!isPaystackConfigured() && (
            <div className="mb-4 rounded-lg border border-accent-400 bg-accent-50 px-4 py-3 text-[15px] text-primary-950">
              Online giving isn&apos;t switched on yet. The bank and Mobile Money details are on the{" "}
              <Link href="/donate" className="font-semibold underline">
                Donate page
              </Link>
              , and the association will record your gift here.
            </div>
          )}
          <AlumniGivingForm onlineGivingEnabled={isPaystackConfigured()} />
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard id="your-giving" title="Your Giving" icon={<HeartHandshake size={20} />} readAloud>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-muted px-3.5 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Lifetime</dt>
                <dd className="mt-1 font-display font-bold text-lg text-primary-950">
                  {formatCedis(summary.lifetimePesewas)}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-muted px-3.5 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Gifts</dt>
                <dd className="mt-1 font-display font-bold text-lg text-primary-950">{summary.giftCount}</dd>
              </div>
            </dl>
            {summary.firstGiftAt && (
              <p className="mt-3 text-sm text-slate">
                You first gave in {dateFormat.format(summary.firstGiftAt)}.
              </p>
            )}
            {summary.byFund.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {summary.byFund.map((fund) => (
                  <li key={fund.fund} className="flex justify-between gap-3 text-sm">
                    <span className="text-slate min-w-0">{fund.label}</span>
                    <span className="font-semibold text-primary-950 shrink-0">{formatCedis(fund.amountPesewas)}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>

          <DashboardCard id="impact" title="What the Funds Did" icon={<Sparkles size={20} />} readAloud>
            <p className="text-sm text-slate mb-3">
              Across the association in the last year — not a receipt for one gift, but what giving like yours paid
              for.
            </p>
            <ul className="space-y-2.5">
              <li className="flex justify-between gap-3">
                <span className="text-slate">Students supported</span>
                <span className="font-semibold text-primary-950">{impact.studentsSupported}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate">Assistive devices provided</span>
                <span className="font-semibold text-primary-950">{impact.assistiveDevicesFunded}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate">Spent on welfare &amp; devices</span>
                <span className="font-semibold text-primary-950">{formatCedis(impact.welfarePaidPesewas)}</span>
              </li>
            </ul>
          </DashboardCard>
        </div>
      </div>

      <div className="mt-6">
        <DashboardCard id="history" title="Your Gifts" icon={<History size={20} />} readAloud>
          {gifts.length === 0 ? (
            <p className="text-slate">No gifts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate uppercase tracking-wide">
                  <tr className="border-b border-line">
                    <th scope="col" className="text-left py-2 pr-3 font-semibold">Date</th>
                    <th scope="col" className="text-left py-2 pr-3 font-semibold">Fund</th>
                    <th scope="col" className="text-left py-2 pr-3 font-semibold">Amount</th>
                    <th scope="col" className="text-left py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {gifts.map((gift) => (
                    <tr key={gift.id}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {dateFormat.format(gift.paidAt ?? gift.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">{donationFundLabel(gift.fund)}</td>
                      <td className="py-2.5 pr-3 font-semibold text-primary-950">
                        {formatCedis(gift.amountPesewas)}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={gift.status} label={gift.status === "SUCCESS" ? "Received" : "Failed"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>
    </>
  );
}
