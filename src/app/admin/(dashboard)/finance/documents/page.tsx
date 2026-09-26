import Link from "next/link";
import { FileText } from "lucide-react";
import { requireCapability } from "@/lib/auth/admin";
import { getDocumentSales, listDocumentSales } from "@/lib/services/patron-finance-service";
import { FinanceSectionNav } from "@/components/admin/FinanceSectionNav";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/ui/Common";
import { formatCedis } from "@/lib/patron-portal-options";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Document sales" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * What the association earned preparing documents.
 *
 * CVs, ID cards, letters and nomination forms are sold at prices the
 * executive sets, and the money is association income like dues or a
 * donation — so it belongs in the books beside them rather than only in
 * the member's own record.
 */
export default async function AdminDocumentSalesPage() {
  await requireCapability("finance.ledger");
  const [sales, byKind] = await Promise.all([listDocumentSales(), getDocumentSales()]);
  const total = byKind.reduce((sum, row) => sum + row.amountPesewas, 0);

  const columns: Column<(typeof sales)[number]>[] = [
    { header: "Date", cell: (sale) => dateFormat.format(sale.paidAt ?? sale.createdAt) },
    {
      header: "Who",
      cell: (sale) =>
        sale.member ? (
          <Link
            href={`/admin/members/${sale.member.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {formatFullName(sale.member.firstName, sale.member.middleName, sale.member.lastName)}
          </Link>
        ) : sale.alumniProfile ? (
          <Link
            href={`/admin/alumni/${sale.alumniProfile.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {sale.alumniProfile.fullName}
          </Link>
        ) : (
          "—"
        ),
    },
    { header: "Document", cell: (sale) => sale.priceLabel },
    {
      header: "Amount",
      align: "right",
      cell: (sale) => <span className="font-data tabular-nums">{formatCedis(sale.amountPesewas)}</span>,
    },
    {
      header: "How",
      cell: (sale) => (sale.recordedBy ? `Cash, recorded by ${sale.recordedBy.name}` : "Online (Paystack)"),
    },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Finance</h1>
      <p className="text-sm text-slate mb-4 max-w-3xl">
        What members and graduates paid for the documents the association prepares for them.
      </p>
      <FinanceSectionNav current="documents" />

      {byKind.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {byKind.map((row) => (
            <div key={row.kind} className="bg-white rounded-lg border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">{row.label}</p>
              <p className="text-xl font-bold text-primary-950 mt-1">{formatCedis(row.amountPesewas)}</p>
              <p className="text-xs text-slate mt-0.5">
                {row.count} sold
              </p>
            </div>
          ))}
        </div>
      )}

      {sales.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} aria-hidden="true" />}
          title="Nothing sold yet"
          description="A CV, ID card, letter or nomination form somebody pays for shows up here."
        />
      ) : (
        <DataTable
          caption="Document sales"
          rows={sales}
          rowKey={(sale) => sale.id}
          columns={columns}
          total={{ label: "Total", value: formatCedis(total) }}
        />
      )}
    </div>
  );
}
