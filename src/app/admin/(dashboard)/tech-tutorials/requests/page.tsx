import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type SoftwareRequestStatus } from "@/generated/prisma/client";
import { countSoftwareRequestsByStatus, listTechRequests } from "@/lib/services/assistive-software-service";
import { TechTutorialsSectionNav } from "@/components/admin/OutreachSectionNav";
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

const KINDS = [
  { value: "ALL", label: "Everything" },
  { value: "SOFTWARE", label: "Software" },
  { value: "TUTORIAL", label: "Tutorials" },
] as const;

export default async function TechRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  await requireCapability("outreach.software.requests");
  const { status: raw, kind: rawKind } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as SoftwareRequestStatus | "ALL") : "NEW";
  const kind = KINDS.some((k) => k.value === rawKind) ? (rawKind as "ALL" | "SOFTWARE" | "TUTORIAL") : "ALL";
  const query = (next: { status?: string; kind?: string }) =>
    `/admin/tech-tutorials/requests?status=${next.status ?? tab}&kind=${next.kind ?? kind}`;
  const [requests, counts] = await Promise.all([
    listTechRequests({
      ...(tab === "ALL" ? {} : { status: tab }),
      ...(kind === "ALL" ? {} : { kind }),
    }),
    countSoftwareRequestsByStatus(),
  ]);
  const total = counts.NEW + counts.IN_PROGRESS + counts.FULFILLED + counts.DECLINED;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Tech &amp; Tutorials</h1>
      <TechTutorialsSectionNav current="requests" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        What people have asked for: software that isn&apos;t in the Telegram library yet, and walk-throughs nobody has
        recorded. Paid software can be bought from the Assistive Technology fund — record the purchase under Finance.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={query({ status: t.value })}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label} ({t.value === "ALL" ? total : counts[t.value]})
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate mr-1">Asked for</span>
        {KINDS.map((k) => (
          <Link
            key={k.value}
            href={query({ kind: k.value })}
            aria-current={kind === k.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              kind === k.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="Nothing here" description="Requests from the Tech & Tutorials page appear here." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Asked for</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">From</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Email</th>
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
                      href={`/admin/tech-tutorials/requests/${request.id}`}
                      className="font-medium text-primary-950 hover:text-accent-600"
                    >
                      {request.topic}
                    </Link>
                    <p className="text-xs text-slate">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                          request.kind === "TUTORIAL" ? "bg-accent-100 text-primary-950" : "bg-primary-50 text-primary-800"
                        }`}
                      >
                        {request.kind === "TUTORIAL" ? "Tutorial" : "Software"}
                      </span>
                      {request.operatingSystem && <span className="ml-2">{request.operatingSystem}</span>}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{request.fullName}</td>
                  <td className="px-5 py-3.5 text-slate">
                    <a href={`mailto:${request.email}`} className="hover:text-accent-600 break-all">
                      {request.email}
                    </a>
                  </td>
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
