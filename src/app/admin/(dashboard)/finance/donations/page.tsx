import Link from "next/link";
import { HandHeart, Plus } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listDonationsForAdmin } from "@/lib/services/patron-finance-service";
import { FinanceSectionNav } from "@/components/admin/FinanceSectionNav";
import { RecordedDonationDeleteButton } from "@/components/admin/FinanceRowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { donationFundLabel, formatCedis } from "@/lib/patron-portal-options";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Donations" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string; all?: string }>;
}) {
  await requireCapability("finance.ledger");
  const { recorded, all } = await searchParams;
  const includePending = all === "1";
  const donations = await listDonationsForAdmin({ includePending });

  const columns: Column<(typeof donations)[number]>[] = [
    { header: "Date", cell: (d) => dateFormat.format(d.paidAt ?? d.createdAt) },
    {
      header: "From",
      cell: (d) => (
        <>
          {d.patronId ? (
            <Link href={`/admin/patrons/${d.patronId}`} className="font-medium text-primary-950 hover:text-accent-600">
              {d.donorName}
            </Link>
          ) : (
            <span className="font-medium text-primary-950">{d.donorName}</span>
          )}
          {d.anonymous && <span className="block text-xs text-slate">Anonymous on the Honor Roll</span>}
          {d.note && <span className="block text-xs text-slate">{d.note}</span>}
        </>
      ),
    },
    { header: "Cause", cell: (d) => donationFundLabel(d.fund) },
    {
      header: "Amount",
      align: "right",
      cell: (d) => <span className="font-data tabular-nums">{formatCedis(d.amountPesewas)}</span>,
    },
    {
      header: "How",
      cell: (d) =>
        d.source === "ONLINE" ? "Online (Paystack)" : `Recorded${d.recordedBy ? ` by ${d.recordedBy.name}` : ""}`,
    },
    {
      header: "Status",
      cell: (d) => (
        <StatusBadge
          status={d.status}
          label={d.status === "SUCCESS" ? "Received" : d.status === "PENDING" ? "Unfinished" : "Failed"}
        />
      ),
    },
    {
      header: "Actions",
      actions: true,
      cell: (d) => (d.source === "RECORDED" ? <RecordedDonationDeleteButton id={d.id} /> : null),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-display font-bold text-2xl text-primary-950">Finance</h1>
        <Link
          href="/admin/finance/donations/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900"
        >
          <Plus size={15} aria-hidden="true" /> Record a Donation
        </Link>
      </div>
      <p className="text-sm text-slate mb-4">
        Online gifts from patrons are recorded automatically. Record cash, cheques and bank transfers here.
      </p>
      <FinanceSectionNav current="donations" />

      {recorded === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Donation recorded.
        </div>
      )}

      <p className="mb-4 text-sm">
        <Link
          href={includePending ? "/admin/finance/donations" : "/admin/finance/donations?all=1"}
          className="font-semibold text-primary-800 hover:text-accent-600"
        >
          {includePending ? "Show received donations only" : "Also show unfinished online attempts"}
        </Link>
      </p>

      {donations.length === 0 ? (
        <EmptyState icon={<HandHeart size={28} />} title="No donations yet" description="Donations will be listed here." />
      ) : (
        <DataTable caption="Donations" rows={donations} rowKey={(d) => d.id} columns={columns} />
      )}
    </div>
  );
}
