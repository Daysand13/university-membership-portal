import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole, type OpportunityStatus } from "@/generated/prisma/client";
import { listOpportunitiesForAdmin } from "@/lib/services/opportunity-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { OPPORTUNITY_STATUS_LABELS, opportunityTypeLabel } from "@/lib/portal-options";

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

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Opportunity Board</h1>
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Jobs, internships and scholarships graduates have posted for students. Nothing appears in either portal until
        you publish it.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
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
      </div>

      {postings.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness size={28} />}
          title="Nothing here"
          description="Postings from graduates appear here for approval."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Opportunity</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Posted by</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Kind</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Posted</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {postings.map((posting) => (
                <tr key={posting.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-sm">
                    <Link
                      href={`/admin/opportunities/${posting.id}`}
                      className="font-medium text-primary-950 hover:text-accent-600"
                    >
                      {posting.title}
                    </Link>
                    <p className="text-xs text-slate">{posting.organization}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{posting.postedByName}</td>
                  <td className="px-5 py-3.5 text-slate">{opportunityTypeLabel(posting.type)}</td>
                  <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(posting.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={posting.status} label={OPPORTUNITY_STATUS_LABELS[posting.status]} />
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
