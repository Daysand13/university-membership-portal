import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, Megaphone } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { listCampaigns, listIssues } from "@/lib/services/advocacy-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IssueStageTracker } from "@/components/patron-portal/Display";
import { campaignStatusLabel, issueCategoryLabel, issueStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Advocacy & Rights" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

export default async function PatronAdvocacyPage() {
  const patron = await requirePatron();
  const [campaigns, issues] = await Promise.all([listCampaigns({ patronId: patron.id }), listIssues()]);
  const openIssues = issues.filter((i) => i.status !== "RESOLVED");
  const resolvedIssues = issues.filter((i) => i.status === "RESOLVED");

  return (
    <div className="space-y-8">
      <PortalPageHeader
        title="Advocacy & Rights"
        description="Back the association's campaigns for students' rights, and act on accessibility issues the executive has escalated to you."
      />

      <section aria-labelledby="campaigns-heading">
        <div className="flex items-center gap-2.5 mb-4">
          <Megaphone size={20} aria-hidden="true" className="text-primary-800" />
          <h2 id="campaigns-heading" className="font-display font-bold text-xl text-primary-950">
            Policy & Petition Campaigns
          </h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-slate bg-white rounded-xl border border-line p-5">No campaigns have been started yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="bg-white rounded-xl border border-line shadow-card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-bold text-lg text-primary-950 leading-snug">{campaign.title}</h3>
                  <StatusBadge status={campaign.status} label={campaignStatusLabel(campaign.status)} />
                </div>
                {(campaign.initiatedBy || campaign.targetBody) && (
                  <p className="text-sm text-slate mt-1">
                    {[campaign.initiatedBy && `Started by ${campaign.initiatedBy}`, campaign.targetBody && `Addressed to ${campaign.targetBody}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-[15px] text-ink mt-3 flex-1">{campaign.summary}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate">
                    {campaign.endorsedByMe ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                        <BadgeCheck size={16} aria-hidden="true" /> Endorsed by you
                      </span>
                    ) : (
                      `${campaign.endorsementCount} patron endorsement${campaign.endorsementCount === 1 ? "" : "s"}`
                    )}
                  </p>
                  <Link
                    href={`/patrons/dashboard/advocacy/campaigns/${campaign.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900"
                  >
                    {campaign.status === "ACTIVE" && !campaign.endorsedByMe ? "Review & Endorse" : "View Campaign"}
                    <ArrowRight size={15} aria-hidden="true" />
                    <span className="sr-only">: {campaign.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="issues-heading">
        <div className="flex items-center gap-2.5 mb-1">
          <AlertTriangle size={20} aria-hidden="true" className="text-primary-800" />
          <h2 id="issues-heading" className="font-display font-bold text-xl text-primary-950">
            Escalated Rights & Accessibility Issues
          </h2>
        </div>
        <p className="text-sm text-slate mb-4">
          Summaries only — the students affected are never named here.
        </p>
        {openIssues.length === 0 ? (
          <p className="text-slate bg-white rounded-xl border border-line p-5">There are no open issues right now.</p>
        ) : (
          <ul className="space-y-4">
            {openIssues.map((issue) => (
              <li key={issue.id} className="bg-white rounded-xl border border-line shadow-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg text-primary-950 leading-snug">{issue.title}</h3>
                    <p className="text-sm text-slate">
                      {[issueCategoryLabel(issue.category), issue.location, `Reported ${dateFormat.format(issue.reportedOn)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Link
                    href={`/patrons/dashboard/advocacy/issues/${issue.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-primary-800 px-3.5 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50"
                  >
                    Take Action <ArrowRight size={15} aria-hidden="true" />
                    <span className="sr-only">: {issue.title}</span>
                  </Link>
                </div>
                <p className="text-[15px] text-ink mt-3 line-clamp-3">{issue.summary}</p>
                <div className="mt-4">
                  <IssueStageTracker status={issue.status} />
                </div>
                {issue._count.actions > 0 && (
                  <p className="text-sm text-slate mt-3">
                    {issue._count.actions} patron action{issue._count.actions === 1 ? "" : "s"} taken
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {resolvedIssues.length > 0 && (
          <details className="mt-5 bg-white rounded-xl border border-line p-5">
            <summary className="cursor-pointer font-semibold text-primary-950">
              Resolved issues ({resolvedIssues.length})
            </summary>
            <ul className="mt-3 divide-y divide-line">
              {resolvedIssues.map((issue) => (
                <li key={issue.id} className="py-2.5">
                  <Link href={`/patrons/dashboard/advocacy/issues/${issue.id}`} className="font-semibold text-primary-950 hover:text-accent-600">
                    {issue.title}
                  </Link>
                  <p className="text-sm text-slate">
                    {issueStatusLabel(issue.status)}
                    {issue.resolvedAt && ` on ${dateFormat.format(issue.resolvedAt)}`}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
