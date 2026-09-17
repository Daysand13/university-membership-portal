import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listCampaigns, listIssues } from "@/lib/services/advocacy-service";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { campaignStatusLabel, issueCategoryLabel, issueStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Advocacy" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

const addButton =
  "inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-900";

export default async function AdminAdvocacyPage() {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const [campaigns, issues] = await Promise.all([listCampaigns(), listIssues()]);

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
          <div className="bg-white rounded-lg border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
                <tr>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Campaign</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Endorsements</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Started</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-muted/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/patrons/advocacy/campaigns/${c.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-data">{c.endorsementCount}</td>
                    <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(c.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} label={campaignStatusLabel(c.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="bg-white rounded-lg border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
                <tr>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Issue</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Category</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Patron actions</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Reported</th>
                  <th scope="col" className="text-left px-5 py-3 font-semibold">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-surface-muted/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/patrons/advocacy/issues/${issue.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                        {issue.title}
                      </Link>
                      {issue.location && <p className="text-xs text-slate">{issue.location}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate">{issueCategoryLabel(issue.category)}</td>
                    <td className="px-5 py-3.5 font-data">{issue._count.actions}</td>
                    <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(issue.reportedOn)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={issue.status} label={issueStatusLabel(issue.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
