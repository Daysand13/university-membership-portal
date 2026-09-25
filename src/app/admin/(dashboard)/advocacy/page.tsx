import Link from "next/link";
import { Scale } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type BarrierReportStatus } from "@/generated/prisma/client";
import { countBarrierReportsByStatus, listBarrierReports } from "@/lib/services/barrier-report-service";
import { EmptyState } from "@/components/ui/Common";
import { barrierStatusLabel } from "@/lib/portal-options";
import { issueCategoryLabel } from "@/lib/patron-portal-options";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Escalation Desk" };
export const dynamic = "force-dynamic";

const TABS: { value: BarrierReportStatus | "OPEN" | "ALL"; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "SUBMITTED", label: "New" },
  { value: "IN_PROGRESS", label: "Being fixed" },
  { value: "ESCALATED", label: "With patrons" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ALL", label: "All" },
];

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

function statusTone(status: string): string {
  if (status === "RESOLVED") return "bg-success-light text-success";
  if (status === "ESCALATED") return "bg-accent-100 text-primary-950";
  if (status === "CLOSED") return "bg-slate-100 text-slate-500";
  if (status === "SUBMITTED") return "bg-warning-light text-warning";
  return "bg-primary-100 text-primary-800";
}

/**
 * The escalation desk: barriers students have reported, in the order they
 * came in. This is the executives' working queue — the students' own view of
 * the same rows is the tracker in their portal, which is why every status
 * change here demands a note.
 */
export default async function AdminAdvocacyDeskPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireCapability("support.barriers");
  const { status: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as BarrierReportStatus | "OPEN" | "ALL") : "OPEN";

  const [reports, counts] = await Promise.all([
    listBarrierReports(
      tab === "ALL" ? {} : tab === "OPEN" ? { openOnly: true } : { status: tab as BarrierReportStatus },
    ),
    countBarrierReportsByStatus(),
  ]);

  const open = counts.SUBMITTED + counts.UNDER_REVIEW + counts.IN_PROGRESS + counts.ESCALATED;
  const all = open + counts.RESOLVED + counts.CLOSED;
  const tabCount = (value: (typeof TABS)[number]["value"]) =>
    value === "ALL" ? all : value === "OPEN" ? open : counts[value];

  const columns: Column<(typeof reports)[number]>[] = [
    {
      header: "Report",
      cell: (report) => (
        <>
          <Link href={`/admin/advocacy/${report.id}`} className="font-medium text-primary-950 hover:text-accent-600">
            {report.title}
          </Link>
          <span className="block text-xs text-slate">
            {issueCategoryLabel(report.category)}
            {report.location && ` · ${report.location}`}
            {report._count.attachments > 0 &&
              ` · ${report._count.attachments} attachment${report._count.attachments === 1 ? "" : "s"}`}
          </span>
        </>
      ),
    },
    {
      header: "Student",
      cell: (report) => (
        <>
          {report.member.firstName} {report.member.lastName}
          <span className="block text-xs font-data">{report.member.indexNumber}</span>
        </>
      ),
    },
    { header: "Filed", cell: (report) => dateFormat.format(report.createdAt) },
    { header: "Handled by", cell: (report) => report.assignedTo?.name ?? "—" },
    {
      header: "Status",
      cell: (report) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(report.status)}`}
        >
          {barrierStatusLabel(report.status)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Escalation Desk</h1>
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Accessibility barriers reported by students. Resolve what you can on campus; escalate what needs the patrons&apos;
        weight behind it. Every note you write is read by the student who filed the report.
      </p>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/advocacy?status=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label} ({tabCount(t.value)})
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <EmptyState
          icon={<Scale size={28} />}
          title="Nothing here"
          description="Barriers students report from their portal land here."
        />
      ) : (
        <DataTable caption="Barrier reports" rows={reports} rowKey={(report) => report.id} columns={columns} />
      )}
    </div>
  );
}
