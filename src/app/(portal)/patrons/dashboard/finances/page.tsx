import Link from "next/link";
import { Award, BarChart3, FileText, HandHeart, PieChart, Receipt, Scale, Wallet } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { isPaystackConfigured } from "@/lib/services/paystack-client";
import {
  getAnnualFinances,
  getDonationTotalsByFund,
  getExpenseAllocation,
  getFinanceTotals,
  getHonorRoll,
  getMonthlyFinances,
  listDonationsForPatron,
  listFinancialReports,
} from "@/lib/services/patron-finance-service";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalNotice } from "@/components/portal/PortalNotice";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadButton } from "@/components/library/DownloadButton";
import { DonationForm } from "@/components/patron-portal/DonationForm";
import { StatTile } from "@/components/patron-portal/Display";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { BarList } from "@/components/charts/BarList";
import { donationFundLabel, formatCedis, formatFileSize } from "@/lib/patron-portal-options";

export const metadata = { title: "Finances & Support" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

const DONATION_NOTICES: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
  success: { tone: "success", text: "Thank you! Your donation was received. We've emailed you a receipt." },
  failed: { tone: "warning", text: "The payment wasn't completed, so nothing was charged. You can try again below." },
  error: {
    tone: "danger",
    text: "We couldn't confirm your payment just now. If you were charged, it will appear here shortly — no need to pay again.",
  },
};

export default async function PatronFinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; donation?: string }>;
}) {
  const patron = await requirePatron();
  const { view, donation } = await searchParams;
  const annual = view === "annual";

  const [totals, periods, allocation, funds, honorRoll, myDonations, reports] = await Promise.all([
    getFinanceTotals(),
    annual ? getAnnualFinances(5) : getMonthlyFinances(12),
    getExpenseAllocation(),
    getDonationTotalsByFund(),
    getHonorRoll(),
    listDonationsForPatron(patron.id),
    listFinancialReports(),
  ]);
  const notice = donation ? DONATION_NOTICES[donation] : undefined;
  const toggleClasses = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-semibold ${active ? "bg-primary-800 text-white" : "text-primary-800 hover:bg-primary-50"}`;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Finances & Support"
        description="Give to the association, and see how its money is raised and spent."
      />
      {notice && <PortalNotice tone={notice.tone}>{notice.text}</PortalNotice>}

      <section aria-label="Totals" className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Funds Raised" value={formatCedis(totals.raised)} icon={<Wallet size={18} />} />
        <StatTile
          label="Patron Contributions"
          value={formatCedis(totals.patronDonations)}
          detail={`Other donations: ${formatCedis(totals.otherDonations)}`}
          icon={<HandHeart size={18} />}
        />
        <StatTile label="Dues Collected" value={formatCedis(totals.dues)} icon={<Receipt size={18} />} />
        <StatTile
          label="Spent So Far"
          value={formatCedis(totals.expenses)}
          detail={`Balance: ${formatCedis(totals.balance)}`}
          icon={<Scale size={18} />}
        />
      </section>

      <section id="give" aria-labelledby="give-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 scroll-mt-24">
        <div className="flex items-center gap-3 mb-1">
          <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-accent-100 text-primary-950 flex items-center justify-center">
            <HandHeart size={20} />
          </span>
          <h2 id="give-heading" className="font-display font-bold text-xl text-primary-950">
            Give Back
          </h2>
        </div>
        <p className="text-[15px] text-slate mb-5">Every gift goes straight to supporting students with special needs.</p>
        {!isPaystackConfigured() && (
          <div className="mb-5">
            <PortalNotice tone="warning" action={<Link href="/donate" className="font-semibold underline">Donate page</Link>}>
              Online giving isn&apos;t switched on yet. For now, please use the bank or Mobile Money details on the Donate page.
            </PortalNotice>
          </div>
        )}
        <DonationForm onlineGivingEnabled={isPaystackConfigured()} />
      </section>

      <DashboardCard id="funds-vs-expenses" title="Funds Raised vs. Expenses" icon={<BarChart3 size={20} />}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-slate">
            {annual ? "The last five years" : "The last twelve months"}: money received, by source, beside money spent.
          </p>
          <nav aria-label="Chart period" className="flex gap-1 rounded-lg bg-surface-muted p-1">
            <Link href="/patrons/dashboard/finances" aria-current={!annual ? "page" : undefined} className={toggleClasses(!annual)} scroll={false}>
              Monthly
            </Link>
            <Link
              href="/patrons/dashboard/finances?view=annual"
              aria-current={annual ? "page" : undefined}
              className={toggleClasses(annual)}
              scroll={false}
            >
              Annual
            </Link>
          </nav>
        </div>
        <ColumnChart
          label={`Funds raised by source and expenses, ${annual ? "per year" : "per month"}`}
          categories={periods.map((p) => p.label)}
          bars={[
            {
              key: "raised",
              label: "Raised",
              series: [
                { key: "dues", label: "Dues", color: "var(--viz-dues)" },
                { key: "patronDonations", label: "Patron donations", color: "var(--viz-patron)" },
                { key: "otherDonations", label: "Other donations", color: "var(--viz-other)" },
              ],
            },
            { key: "spent", label: "Expenses", series: [{ key: "expenses", label: "Expenses", color: "var(--viz-expense)" }] },
          ]}
          values={{
            dues: periods.map((p) => p.dues),
            patronDonations: periods.map((p) => p.patronDonations),
            otherDonations: periods.map((p) => p.otherDonations),
            expenses: periods.map((p) => p.expenses),
          }}
          formatValue={(n) => formatCedis(n)}
          formatTick={(n) => formatCedis(n, { compact: true })}
          minWidth={560}
        />
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard id="allocation" title="Where the Money Goes" icon={<PieChart size={20} />}>
          <p className="text-sm text-slate mb-4">Everything spent so far, by area.</p>
          {allocation.length === 0 ? (
            <p className="text-slate">No spending has been recorded yet.</p>
          ) : (
            <BarList
              label="Spending by area"
              rows={allocation.map((a) => ({ key: a.category, label: a.label, value: a.amountPesewas }))}
              color="var(--viz-expense)"
              formatValue={(n) => formatCedis(n)}
            />
          )}
        </DashboardCard>

        <DashboardCard id="by-cause" title="Donations by Cause" icon={<HandHeart size={20} />}>
          <dl className="divide-y divide-line">
            {funds.map((fund) => (
              <div key={fund.fund} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-sm text-primary-950">{fund.label}</dt>
                <dd className="font-data font-semibold tabular-nums text-ink shrink-0">{formatCedis(fund.amountPesewas)}</dd>
              </div>
            ))}
          </dl>
        </DashboardCard>

        <DashboardCard id="ledger" title="Contribution Ledger" icon={<FileText size={20} />}>
          <p className="text-sm text-slate mb-4">Quarterly balance sheets prepared by the executive team.</p>
          {reports.length === 0 ? (
            <p className="text-slate">No financial reports have been published yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary-950">{report.title}</p>
                    <p className="text-xs text-slate">
                      {[report.version, dateFormat.format(report.createdAt), formatFileSize(report.fileSize)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <DownloadButton
                    documentId={report.id}
                    forPatron
                    label="Download PDF"
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary-800 px-3 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50"
                  />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard id="honor-roll" title="Patron Honor Roll" icon={<Award size={20} />} readAloud>
          <p className="text-sm text-slate mb-4">With thanks to the patrons who have given. Amounts are never shown.</p>
          {honorRoll.length === 0 ? (
            <p className="text-slate">Be the first name on the Honor Roll.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {honorRoll.map((entry) => (
                <li key={entry.patronId} className="rounded-lg bg-surface-muted px-3 py-2">
                  <p className="font-semibold text-primary-950">{entry.name}</p>
                  {entry.organization && <p className="text-xs text-slate">{entry.organization}</p>}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <DashboardCard id="my-giving" title="Your Giving" icon={<Receipt size={20} />}>
        {myDonations.length === 0 ? (
          <p className="text-slate">Your donations will be listed here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Your donations</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Cause</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-right">Amount</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                  <th scope="col" className="py-2 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {myDonations.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{dateFormat.format(d.paidAt ?? d.createdAt)}</td>
                    <td className="py-2.5 pr-4">{donationFundLabel(d.fund)}</td>
                    <td className="py-2.5 pr-4 text-right font-data tabular-nums font-semibold">{formatCedis(d.amountPesewas)}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={d.status} label={d.status === "SUCCESS" ? "Received" : "Not completed"} />
                    </td>
                    <td className="py-2.5 font-data text-xs text-slate break-all">{d.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
