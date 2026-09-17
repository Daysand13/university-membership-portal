import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, History, Scale } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { getIssue } from "@/lib/services/advocacy-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { IssueStageTracker } from "@/components/patron-portal/Display";
import { IssueActionForm } from "@/components/patron-portal/AdvocacyForms";
import { issueActionLabel, issueCategoryLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Escalated Issue" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" });

export default async function PatronIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const patron = await requirePatron();
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();
  const resolved = issue.status === "RESOLVED";

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/patrons/dashboard/advocacy" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600">
        <ArrowLeft size={15} aria-hidden="true" /> Advocacy & Rights
      </Link>
      <PortalPageHeader
        title={issue.title}
        description={[issueCategoryLabel(issue.category), issue.location, `Reported ${dateFormat.format(issue.reportedOn)}`]
          .filter(Boolean)
          .join(" · ")}
      />

      <section aria-label="Status" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <IssueStageTracker status={issue.status} />
      </section>

      <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-primary-950 mb-2">Summary</h2>
        <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line">{issue.summary}</p>
        {resolved && (
          <div className="mt-4 rounded-lg bg-success-light border border-success/30 p-4">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 size={18} aria-hidden="true" /> Resolved
              {issue.resolvedAt && ` on ${dateFormat.format(issue.resolvedAt)}`}
            </p>
            {issue.resolutionNote && <p className="mt-1 text-[15px] text-ink whitespace-pre-line">{issue.resolutionNote}</p>}
          </div>
        )}
      </section>

      {!resolved && (
        <section aria-labelledby="act-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
          <h2 id="act-heading" className="flex items-center gap-2 font-display font-bold text-lg text-primary-950 mb-1">
            <Scale size={20} aria-hidden="true" className="text-primary-800" /> Take Action
          </h2>
          <p className="text-sm text-slate mb-4">
            Ask the executive to arrange a meeting with university management, or put your position on record as an
            official patron statement.
          </p>
          <IssueActionForm issueId={issue.id} />
        </section>
      )}

      <DashboardCard id="issue-actions" title="Patron Actions" icon={<History size={20} />}>
        {issue.actions.length === 0 ? (
          <p className="text-slate">No patron has acted on this issue yet.</p>
        ) : (
          <ol className="space-y-4">
            {issue.actions.map((action) => (
              <li key={action.id} className="border-l-2 border-accent-500 pl-4">
                <p className="text-sm font-semibold text-primary-950">
                  {issueActionLabel(action.type)}
                  <span className="font-normal text-slate">
                    {" "}
                    · {[action.patron.title, action.patron.fullName].filter(Boolean).join(" ")}
                    {action.patronId === patron.id && " (you)"} · {dateFormat.format(action.createdAt)}
                  </span>
                </p>
                <p className="text-[15px] text-ink whitespace-pre-line mt-1">{action.message}</p>
              </li>
            ))}
          </ol>
        )}
      </DashboardCard>
    </div>
  );
}
