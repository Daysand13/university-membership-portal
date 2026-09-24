import Link from "next/link";
import { Wallet, CheckCircle2, XCircle, Banknote, CreditCard, Undo2, FileDown, Search } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import {
  getCurrentAcademicYear,
  listMemberDuesStatus,
  formatPesewasAsCedis,
  filterDuesRows,
} from "@/lib/services/dues-service";
import { recordCashDuesPaymentAction, removeCashDuesPaymentAction } from "@/lib/actions/admin-dues-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Membership Dues" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

interface DuesSearchParams {
  status?: "paid" | "unpaid";
  /** A name or an index number — whoever the officer at the desk is looking for. */
  q?: string;
}

export default async function AdminDuesPage({ searchParams }: { searchParams: Promise<DuesSearchParams> }) {
  await requireCapability("finance.dues");
  const sp = await searchParams;
  const academicYear = getCurrentAcademicYear();
  const allRows = await listMemberDuesStatus(academicYear);

  const search = (sp.q ?? "").trim();
  const rows = filterDuesRows(allRows, { status: sp.status, search });

  // The ledger that downloads is the rows on screen, so the button never
  // quietly hands over more than was asked for.
  const exportQuery = new URLSearchParams({ year: academicYear });
  if (sp.status) exportQuery.set("status", sp.status);
  if (search) exportQuery.set("q", search);

  const paidCount = allRows.filter((r) => r.paid).length;
  // What was actually paid (online or cash), not today's fee, which can differ if a tier changed since.
  const totalCollectedPesewas = allRows.reduce((sum, r) => sum + (r.payment?.amountPesewas ?? 0), 0);

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

      <form className="mb-6 bg-white rounded-lg border border-line p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[15rem]">
          <label htmlFor="dues-search" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1.5">
            Find a member
          </label>
          <input
            id="dues-search"
            name="q"
            defaultValue={search}
            placeholder="Name or index number"
            className={`${selectClasses} w-full`}
          />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className={selectClasses} aria-label="Payment status">
          <option value="">All Members</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-900"
        >
          <Search size={15} aria-hidden="true" /> Apply
        </button>
        {(search || sp.status) && (
          <Link href="/admin/dues" className="text-sm font-semibold text-slate hover:text-primary-800 px-2 py-2">
            Clear
          </Link>
        )}
        <a
          href={`/api/admin/dues/export?${exportQuery.toString()}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
        >
          <FileDown size={15} aria-hidden="true" /> Download ledger (PDF)
        </a>
      </form>

      {(search || sp.status) && (
        <p className="text-sm text-slate mb-4">
          Showing {rows.length} of {allRows.length} member{allRows.length === 1 ? "" : "s"}
          {search && ` matching "${search}"`}
          {sp.status === "paid" && " who have paid"}
          {sp.status === "unpaid" && " who have not paid"}. The ledger button downloads exactly these.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title={search ? `Nobody matching "${search}"` : "No members match this filter"}
          description={search ? "Try part of the name, or the index number on its own." : undefined}
        />
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
                <th className="text-left px-5 py-3 font-semibold">Method</th>
                <th className="text-right px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
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
                  <td className="px-5 py-3.5 text-xs">
                    {row.payment ? (
                      <span className="inline-flex items-center gap-1 text-ink font-medium">
                        {row.payment.method === "cash" ? <Banknote size={13} /> : <CreditCard size={13} />}
                        {row.payment.method === "cash" ? "Cash" : "Online"}
                      </span>
                    ) : (
                      <span className="text-slate-light">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {!row.payment ? (
                      <ConfirmButton
                        action={recordCashDuesPaymentAction.bind(null, row.memberId)}
                        confirmMessage={`Record ${row.fullName}'s ${academicYear} dues of ${formatPesewasAsCedis(row.fee.amountPesewas)} as paid in cash?\n\nOnly do this once the cash is in hand. ${row.fullName} will be emailed a receipt.`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-surface-muted hover:text-accent-600 disabled:opacity-60"
                      >
                        <Banknote size={13} /> Mark paid (cash)
                      </ConfirmButton>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`/api/dues/receipt/${row.payment.id}`}
                          aria-label={`Download ${row.fullName}'s receipt`}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-surface-muted hover:text-accent-600"
                        >
                          <FileDown size={13} /> Receipt
                        </a>
                        {row.payment.method === "cash" && (
                      <ConfirmButton
                        action={removeCashDuesPaymentAction.bind(null, row.payment.id)}
                        confirmMessage={`Remove the cash payment recorded for ${row.fullName}?\n\nTheir ${academicYear} dues will show as unpaid again, and they'll be emailed that it was removed.`}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate hover:bg-surface-muted hover:text-danger disabled:opacity-60"
                      >
                        <Undo2 size={13} /> Undo
                      </ConfirmButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
