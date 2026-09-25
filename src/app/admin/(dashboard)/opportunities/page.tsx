import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type OpportunityStatus } from "@/generated/prisma/client";
import { listOpportunitiesForAdmin } from "@/lib/services/opportunity-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { OPPORTUNITY_STATUS_LABELS, opportunityTypeLabel } from "@/lib/portal-options";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Opportunity Board" };
export const dynamic = "force-dynamic";

const TABS: { value: OpportunityStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Awaiting approval" },
  { value: "APPROVED", label: "Published" },
  { value: "REJECTED", label: "Declined" },
  { value: "ALL", label: "All" },
];

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

/**
 * Moderation for the alumni opportunity board. A posting carries an outside
 * link and an outside email address into a portal whose members are a group
 * people do target — so somebody reads each one first.
 */
export default async function AdminOpportunitiesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireCapability("support.opportunities");
  const { status: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as OpportunityStatus | "ALL") : "PENDING";
  const postings = await listOpportunitiesForAdmin(tab === "ALL" ? undefined : tab);

  const columns: Column<(typeof postings)[number]>[] = [
    {
      header: "Opportunity",
      cell: (posting) => (
        <>
          <Link
            href={`/admin/opportunities/${posting.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {posting.title}
          </Link>
          <span className="block text-xs text-slate">{posting.organization}</span>
        </>
      ),
    },
    { header: "Posted by", cell: (posting) => posting.postedByName },
    { header: "Kind", cell: (posting) => opportunityTypeLabel(posting.type) },
    { header: "Posted", cell: (posting) => dateFormat.format(posting.createdAt) },
    {
      header: "Status",
      cell: (posting) => <StatusBadge status={posting.status} label={OPPORTUNITY_STATUS_LABELS[posting.status]} />,
    },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Opportunity Board</h1>
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Jobs, internships and scholarships graduates have posted for students. Nothing appears in either portal until
        you publish it.
      </p>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/opportunities?status=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {postings.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness size={28} />}
          title="Nothing here"
          description="Postings from graduates appear here for approval."
        />
      ) : (
        <DataTable caption="Opportunity postings" rows={postings} rowKey={(posting) => posting.id} columns={columns} />
      )}
    </div>
  );
}
