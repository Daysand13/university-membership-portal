import Link from "next/link";
import { BookOpen, Megaphone, Plus, Scale, ScrollText } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { listReportsForMember } from "@/lib/services/barrier-report-service";
import { listCampaignsForStudents } from "@/lib/services/advocacy-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Common";
import { BarrierStatusText, reportDateFormat } from "@/components/student-portal/Display";
import { issueCategoryLabel } from "@/lib/patron-portal-options";
import { campaignStatusLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "My Rights & Advocacy" };
export const dynamic = "force-dynamic";

/**
 * Where a student reports a barrier and follows what happened next — plus
 * the campaigns the association is running on their behalf, so the two read
 * as one effort rather than two separate systems.
 */
export default async function StudentRightsPage() {
  const member = await requireMember();
  const [reports, campaigns] = await Promise.all([listReportsForMember(member.id), listCampaignsForStudents()]);

  return (
    <>
      <PortalPageHeader
        title="My Rights & Advocacy"
        description="Tell the association about anything on campus that shuts you out — a locked lift, an exam venue you can't reach, a paper with no audio version. Every report goes to the executives, and you can follow exactly what they do about it."
        actions={
          <LinkButton href="/membership/dashboard/rights/new">
            <Plus size={16} aria-hidden="true" /> Report a barrier
          </LinkButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <DashboardCard id="my-reports" title="Your Reports" icon={<Scale size={20} />} readAloud>
          {reports.length === 0 ? (
            <EmptyState
              icon={<Scale size={28} aria-hidden="true" />}
              title="You haven't reported anything yet"
              description="If something on campus is getting in your way, tell us — it's the only way it gets fixed."
            />
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <Link
                      href={`/membership/dashboard/rights/${report.id}`}
                      className="font-semibold text-primary-800 hover:text-accent-600 hover:underline break-words min-w-0"
                    >
                      {report.title}
                    </Link>
                    <BarrierStatusText status={report.status} />
                  </div>
                  <p className="text-sm text-slate mt-0.5">
                    {issueCategoryLabel(report.category)} · Filed {reportDateFormat.format(report.createdAt)}
                    {report._count.attachments > 0 && (
                      <>
                        {" "}
                        · {report._count.attachments} attachment{report._count.attachments === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard id="campaigns" title="Campaigns You're Part Of" icon={<Megaphone size={20} />} readAloud>
            <p className="text-sm text-slate mb-3">
              Campaigns the association is running with the university. Patrons endorse them and graduates co-sign
              them — the weight behind them is the whole association&apos;s.
            </p>
            {campaigns.length === 0 ? (
              <p className="text-slate">No campaigns are running at the moment.</p>
            ) : (
              <ul className="divide-y divide-line">
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-semibold text-primary-950 break-words">{campaign.title}</p>
                    <p className="text-xs text-slate mt-0.5">
                      {campaignStatusLabel(campaign.status)} · {campaign.endorsementCount} signature
                      {campaign.endorsementCount === 1 ? "" : "s"}
                      {campaign.targetBody && <> · Addressed to {campaign.targetBody}</>}
                    </p>
                    <p className="text-sm text-slate mt-1">{campaign.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>

          <DashboardCard id="charter" title="Know Your Rights" icon={<ScrollText size={20} />}>
            <p className="text-[15px] text-ink">
              The association&apos;s charter, policies and the university&apos;s accessibility commitments are kept in
              the library, free for any member to read.
            </p>
            <Link
              href="/library"
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:text-accent-600"
            >
              <BookOpen size={15} aria-hidden="true" /> Open the document library
            </Link>
          </DashboardCard>
        </div>
      </div>
    </>
  );
}
