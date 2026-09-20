import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type SupportRequestStatus } from "@/generated/prisma/client";
import {
  countSupportRequestsByStatus,
  listSupportRequests,
  sumApprovedUnpaidPesewas,
} from "@/lib/services/support-request-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { formatCedis } from "@/lib/patron-portal-options";
import { supportRequestTypeLabel, supportStatusLabel } from "@/lib/portal-options";

export const metadata = { title: "Support Requests" };
export const dynamic = "force-dynamic";

const TABS: { value: SupportRequestStatus | "OPEN" | "ALL"; label: string }[] = [
  { value: "OPEN", label: "Needs a decision" },
  { value: "APPROVED", label: "Approved" },
  { value: "FULFILLED", label: "Provided" },
  { value: "DECLINED", label: "Declined" },
  { value: "ALL", label: "All" },
];

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

/**
 * Requests for assistive technology, note-takers and the welfare fund.
 * Approving one is a decision; paying it out is a separate, recorded step —
 * see support-request-service for why those are deliberately not one action.
 */
export default async function AdminSupportRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireCapability("support.requests");
  const { status: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as SupportRequestStatus | "OPEN" | "ALL") : "OPEN";

  const [requests, counts, unpaid] = await Promise.all([
    listSupportRequests(
      tab === "ALL" ? {} : tab === "OPEN" ? { openOnly: true } : { status: tab as SupportRequestStatus },
    ),
    countSupportRequestsByStatus(),
    sumApprovedUnpaidPesewas(),
  ]);

  const open = counts.SUBMITTED + counts.UNDER_REVIEW + counts.APPROVED;
  const all = open + counts.DECLINED + counts.FULFILLED;
  const tabCount = (value: (typeof TABS)[number]["value"]) =>
    value === "ALL" ? all : value === "OPEN" ? open : counts[value];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Support Requests</h1>
      <p className="text-sm text-slate mb-5 max-w-3xl">
        What students have asked the association for. Approving a welfare request is a promise — recording the payout
        afterwards is what puts it in the books.
      </p>

      {unpaid > 0 && (
        <div className="mb-5 rounded-lg border border-accent-400 bg-accent-50 px-4 py-3 text-sm text-primary-950">
          <span className="font-semibold">{formatCedis(unpaid)}</span> has been approved but not yet paid out.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/support-requests?status=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label} ({tabCount(t.value)})
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={28} />}
          title="Nothing here"
          description="Requests students make from their portal appear here."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Request</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Student</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Amount</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Asked</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-sm">
                    <Link
                      href={`/admin/support-requests/${request.id}`}
                      className="font-medium text-primary-950 hover:text-accent-600"
                    >
                      {supportRequestTypeLabel(request.type)}
                    </Link>
                    <p className="text-xs text-slate line-clamp-1">{request.details}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">
                    {request.member.firstName} {request.member.lastName}
                    <span className="block text-xs font-data">{request.member.indexNumber}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate whitespace-nowrap">
                    {request.approvedAmountPesewas
                      ? formatCedis(request.approvedAmountPesewas)
                      : request.amountRequestedPesewas
                        ? formatCedis(request.amountRequestedPesewas)
                        : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(request.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      status={request.status === "FULFILLED" ? "APPROVED" : request.status}
                      label={supportStatusLabel(request.status)}
                    />
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
