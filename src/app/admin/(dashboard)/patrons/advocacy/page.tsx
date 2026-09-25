import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listCampaigns, listIssues } from "@/lib/services/advocacy-service";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { campaignStatusLabel, issueCategoryLabel, issueStatusLabel } from "@/lib/patron-portal-options";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Advocacy" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

const addButton =
  "inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900";

export default async function AdminAdvocacyPage() {
  await requireCapability("members.patrons");
  const [campaigns, issues] = await Promise.all([listCampaigns(), listIssues()]);

  const campaignColumns: Column<(typeof campaigns)[number]>[] = [
    {
      header: "Campaign",
      cell: (c) => (
        <Link
          href={`/admin/patrons/advocacy/campaigns/${c.id}`}
          className="font-medium text-primary-950 hover:text-accent-600"
        >
          {c.title}
        </Link>
      ),
    },
    { header: "Endorsements", cell: (c) => <span className="font-data">{c.endorsementCount}</span> },
    { header: "Started", cell: (c) => dateFormat.format(c.createdAt) },
    { header: "Status", cell: (c) => <StatusBadge status={c.status} label={campaignStatusLabel(c.status)} /> },
  ];

  const issueColumns: Column<(typeof issues)[number]>[] = [
    {
      header: "Issue",
      cell: (issue) => (
        <>
          <Link
            href={`/admin/patrons/advocacy/issues/${issue.id}`}
            className="font-medium text-primary-950 hover:text-accent-600"
          >
            {issue.title}
          </Link>
          {issue.location && <span className="block text-xs text-slate">{issue.location}</span>}
        </>
      ),
    },
    { header: "Category", cell: (issue) => issueCategoryLabel(issue.category) },
    { header: "Patron actions", cell: (issue) => <span className="font-data">{issue._count.actions}</span> },
    { header: "Reported", cell: (issue) => dateFormat.format(issue.reportedOn) },
    { header: "Stage", cell: (issue) => <StatusBadge status={issue.status} label={issueStatusLabel(issue.status)} /> },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Patrons</h1>
      <PatronsSectionNav current="advocacy" />
      <p className="text-sm text-slate mb-6 max-w-3xl">
        Campaigns patrons can officially endorse, and rights or accessibility issues escalated to them. Patrons are
        notified of new ones in their portal, and you&apos;re emailed when they endorse or act.
      </p>

      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-lg text-primary-950">Campaigns</h2>
          <Link href="/admin/patrons/advocacy/campaigns/new" className={addButton}>
            <Plus size={15} aria-hidden="true" /> New Campaign
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate bg-white rounded-lg border border-line p-5">No campaigns yet.</p>
        ) : (
          <DataTable caption="Advocacy campaigns" rows={campaigns} rowKey={(c) => c.id} columns={campaignColumns} />
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-lg text-primary-950">Escalated Issues</h2>
          <Link href="/admin/patrons/advocacy/issues/new" className={addButton}>
            <Plus size={15} aria-hidden="true" /> Escalate an Issue
          </Link>
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-slate bg-white rounded-lg border border-line p-5">No issues have been escalated yet.</p>
        ) : (
          <DataTable caption="Escalated issues" rows={issues} rowKey={(issue) => issue.id} columns={issueColumns} />
        )}
      </section>
    </div>
  );
}
