import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type SoftwareRequestStatus } from "@/generated/prisma/client";
import { countSoftwareRequestsByStatus, listTechRequests } from "@/lib/services/assistive-software-service";
import { TechTutorialsSectionNav } from "@/components/admin/OutreachSectionNav";
import { EmptyState } from "@/components/ui/Common";
import { DataTable, type Column } from "@/components/admin/DataTable";
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

  const columns: Column<(typeof requests)[number]>[] = [
    {
      header: "Asked for",
      cell: (request) => (
        <>
          <Link
            href={`/admin/tech-tutorials/requests/${request.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {request.topic}
          </Link>
          <span className="block text-xs text-slate">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                request.kind === "TUTORIAL" ? "bg-accent-100 text-primary-950" : "bg-primary-50 text-primary-800"
              }`}
            >
              {request.kind === "TUTORIAL" ? "Tutorial" : "Software"}
            </span>
            {request.operatingSystem && <span className="ml-2">{request.operatingSystem}</span>}
          </span>
        </>
      ),
    },
    { header: "From", cell: (request) => request.fullName },
    {
      header: "Email",
      cell: (request) => (
        <a href={`mailto:${request.email}`} className="hover:text-accent-600 break-all">
          {request.email}
        </a>
      ),
    },
    { header: "For", cell: (request) => softwareCategoryLabel(request.category) },
    { header: "Asked", cell: (request) => dateFormat.format(request.createdAt) },
    {
      header: "Status",
      cell: (request) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[request.status]}`}>
          {SOFTWARE_REQUEST_STATUS_LABELS[request.status]}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Tech &amp; Tutorials</h1>
      <TechTutorialsSectionNav current="requests" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        What people have asked for: software that isn&apos;t in the Telegram library yet, and walk-throughs nobody has
        recorded. Paid software can be bought from the Assistive Technology fund — record the purchase under Finance.
      </p>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5 mb-5">
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
      </nav>

      <nav aria-label="Filter by what was asked for" className="flex flex-wrap items-center gap-1.5 mb-5">
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
      </nav>

      {requests.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="Nothing here" description="Requests from the Tech & Tutorials page appear here." />
      ) : (
        <DataTable caption="Software and tutorial requests" rows={requests} rowKey={(request) => request.id} columns={columns} />
      )}
    </div>
  );
}
