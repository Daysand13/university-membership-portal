import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type SoftwareRequestStatus } from "@/generated/prisma/client";
import { countSoftwareRequestsByStatus, listSoftwareRequests } from "@/lib/services/assistive-software-service";
import { AssistiveTechSectionNav } from "@/components/admin/OutreachSectionNav";
import { EmptyState } from "@/components/ui/Common";
import { SOFTWARE_REQUEST_STATUS_LABELS, softwareCategoryLabel } from "@/lib/outreach-options";

export const metadata = { title: "Software Requests" };
export const dynamic = "force-dynamic";

const TABS: { value: SoftwareRequestStatus | "ALL"; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "Being sourced" },
  { value: "FULFILLED", label: "Provided" },
  { value: "DECLINED", label: "Not possible" },
  { value: "ALL", label: "All" },
];

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-warning-light text-warning",
  IN_PROGRESS: "bg-primary-100 text-primary-800",
  FULFILLED: "bg-success-light text-success",
  DECLINED: "bg-slate-100 text-slate-500",
};

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

export default async function SoftwareRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireCapability("outreach.software.requests");
  const { status: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as SoftwareRequestStatus | "ALL") : "NEW";
  const [requests, counts] = await Promise.all([
    listSoftwareRequests(tab === "ALL" ? undefined : tab),
    countSoftwareRequestsByStatus(),
  ]);
  const total = counts.NEW + counts.IN_PROGRESS + counts.FULFILLED + counts.DECLINED;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Assistive Software</h1>
      <AssistiveTechSectionNav current="requests" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Tools people asked for that aren&apos;t in the Telegram library yet. Paid ones can be bought from the Assistive
        Technology fund — record the purchase under Finance.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/assistive-tech/requests?status=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label} ({t.value === "ALL" ? total : counts[t.value]})
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="Nothing here" description="Requests from the Assistive Software page appear here." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Software</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">From</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">For</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Asked</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/assistive-tech/requests/${request.id}`}
                      className="font-medium text-primary-950 hover:text-accent-600"
                    >
                      {request.softwareName}
                    </Link>
                    <p className="text-xs text-slate">{request.operatingSystem}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{request.fullName}</td>
                  <td className="px-5 py-3.5 text-slate">{softwareCategoryLabel(request.category)}</td>
                  <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(request.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[request.status]}`}>
                      {SOFTWARE_REQUEST_STATUS_LABELS[request.status]}
                    </span>
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
