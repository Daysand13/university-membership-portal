import { Wallet, CheckCircle2, XCircle } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getCurrentAcademicYear, listMemberDuesStatus, formatPesewasAsCedis } from "@/lib/services/dues-service";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Membership Dues" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

interface DuesSearchParams {
  status?: "paid" | "unpaid";
}

export default async function AdminDuesPage({ searchParams }: { searchParams: Promise<DuesSearchParams> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const sp = await searchParams;
  const academicYear = getCurrentAcademicYear();
  const allRows = await listMemberDuesStatus(academicYear);

  const rows = sp.status === "paid" ? allRows.filter((r) => r.paid) : sp.status === "unpaid" ? allRows.filter((r) => !r.paid) : allRows;

  const paidCount = allRows.filter((r) => r.paid).length;
  const totalCollectedPesewas = allRows.filter((r) => r.paid).reduce((sum, r) => sum + r.fee.amountPesewas, 0);

  const selectClasses =
    "rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Membership Dues</h1>
        <p className="text-sm text-slate mt-1">
          {academicYear} academic year — dues are not enforced yet, this is a status view only.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Active Members</p>
          <p className="text-2xl font-bold text-primary-950 mt-1">{allRows.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Paid This Year</p>
          <p className="text-2xl font-bold text-success mt-1">
            {paidCount} <span className="text-sm font-normal text-slate">/ {allRows.length}</span>
          </p>
        </div>
        <div className="bg-white rounded-lg border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Collected</p>
          <p className="text-2xl font-bold text-primary-950 mt-1">{formatPesewasAsCedis(totalCollectedPesewas)}</p>
        </div>
      </div>

      <form className="mb-6 bg-white rounded-lg border border-line p-4 flex flex-wrap items-center gap-3">
        <select name="status" defaultValue={sp.status ?? ""} className={selectClasses}>
          <option value="">All Members</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>
        <button type="submit" className="rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900">
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<Wallet size={28} />} title="No members match this filter" />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Index Number</th>
                <th className="text-left px-5 py-3 font-semibold">Tier</th>
                <th className="text-left px-5 py-3 font-semibold">Fee</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Paid On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.memberId} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 font-medium text-primary-950">{row.fullName}</td>
                  <td className="px-5 py-3.5 font-data text-xs text-ink">{row.indexNumber}</td>
                  <td className="px-5 py-3.5 text-slate">{row.fee.tierLabel}</td>
                  <td className="px-5 py-3.5 text-slate">{formatPesewasAsCedis(row.fee.amountPesewas)}</td>
                  <td className="px-5 py-3.5">
                    {row.paid ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs font-semibold">
                        <CheckCircle2 size={13} /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-light text-xs font-semibold">
                        <XCircle size={13} /> Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-light text-xs">{row.paidAt ? formatDate(row.paidAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
