import { BriefcaseBusiness, Plus } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { listOpenOpportunities, listOpportunitiesForAlumni } from "@/lib/services/opportunity-service";
import { withdrawOpportunityAction } from "@/lib/actions/alumni-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { OpportunityList } from "@/components/portal/OpportunityList";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { OpportunityForm } from "@/components/alumni-portal/Forms";
import { PortalActionButton } from "@/components/student-portal/Forms";
import { OPPORTUNITY_STATUS_LABELS, opportunityTypeLabel } from "@/lib/portal-options";

export const metadata = { title: "Opportunity Board" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * The opportunity board from a graduate's side: what's on it, and what they
 * can add to it. Posting is the single most direct thing an alumnus can do
 * for a student here — more direct than giving, in most cases.
 */
export default async function AlumniOpportunitiesPage() {
  const alumni = await requireAlumni();
  const [open, mine] = await Promise.all([listOpenOpportunities(), listOpportunitiesForAlumni(alumni.id)]);

  return (
    <>
      <PortalPageHeader
        title="Opportunity Board"
        description="Jobs, internships, scholarships and volunteering posted by graduates for students and each other. An administrator checks each posting before it appears."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <DashboardCard id="board" title="On the Board" icon={<BriefcaseBusiness size={20} />} readAloud>
          {open.length === 0 ? (
            <EmptyState
              icon={<BriefcaseBusiness size={28} aria-hidden="true" />}
              title="Nothing on the board yet"
              description="Know of an opening that would suit a graduate of this association? Post it."
            />
          ) : (
            <OpportunityList items={open} />
          )}
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard id="post" title="Post an Opportunity" icon={<Plus size={20} />}>
            <OpportunityForm />
          </DashboardCard>

          {mine.length > 0 && (
            <DashboardCard id="my-postings" title="Your Postings" icon={<BriefcaseBusiness size={20} />}>
              <ul className="divide-y divide-line">
                {mine.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="font-semibold text-primary-950 break-words min-w-0">{item.title}</p>
                      <StatusBadge status={item.status} label={OPPORTUNITY_STATUS_LABELS[item.status]} />
                    </div>
                    <p className="text-xs text-slate mt-0.5">
                      {opportunityTypeLabel(item.type)} · {item.organization} · posted{" "}
                      {dateFormat.format(item.createdAt)}
                    </p>
                    {item.reviewNote && (
                      <p className="mt-1.5 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink">{item.reviewNote}</p>
                    )}
                    {item.status === "PENDING" && (
                      <div className="mt-2">
                        <PortalActionButton
                          action={withdrawOpportunityAction.bind(null, item.id)}
                          variant="danger"
                          confirm="Take this posting back?"
                          pendingLabel="Withdrawing…"
                        >
                          Withdraw
                        </PortalActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </DashboardCard>
          )}
        </div>
      </div>
    </>
  );
}
