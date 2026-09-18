import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks, Paperclip, Scale } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { getReportForMember } from "@/lib/services/barrier-report-service";
import { withdrawReportAction } from "@/lib/actions/student-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalNotice } from "@/components/portal/PortalNotice";
import { DashboardCard } from "@/components/portal/DashboardCard";
import {
  BarrierStatusText,
  BarrierTracker,
  EvidenceList,
  ReportUpdates,
  reportDateFormat,
} from "@/components/student-portal/Display";
import { PortalActionButton } from "@/components/student-portal/Forms";
import { issueCategoryLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Your Report" };
export const dynamic = "force-dynamic";

export default async function BarrierReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filed?: string }>;
}) {
  const member = await requireMember();
  const [{ id }, { filed }] = await Promise.all([params, searchParams]);
  const report = await getReportForMember({ memberId: member.id, id });
  if (!report) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/membership/dashboard/rights"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> My Rights & Advocacy
      </Link>

      {filed === "1" && (
        <PortalNotice tone="success">
          Your report has been sent to the executives. You&apos;ll get an email whenever there&apos;s an update, and it
          all shows here too.
        </PortalNotice>
      )}

      <PortalPageHeader
        title={report.title}
        description={
          <>
            <BarrierStatusText status={report.status} /> · {issueCategoryLabel(report.category)} · Filed{" "}
            {reportDateFormat.format(report.createdAt)}
            {report.location && <> · {report.location}</>}
          </>
        }
      />

      <DashboardCard id="tracker" title="Where This Has Got To" icon={<ListChecks size={20} />} readAloud>
        <BarrierTracker status={report.status} />
        {report.assignedTo && (
          <p className="mt-3 text-sm text-slate">
            Being handled by <span className="font-semibold text-primary-950">{report.assignedTo.name}</span>.
          </p>
        )}
        {report.escalatedIssue && (
          <p className="mt-3 rounded-lg bg-accent-50 border border-accent-400 px-3.5 py-3 text-[15px] text-primary-950">
            This has been put to the association&apos;s patrons as{" "}
            <span className="font-semibold">{report.escalatedIssue.title}</span>. Your name and anything you attached
            stayed with the executives.
          </p>
        )}
      </DashboardCard>

      <DashboardCard id="what-you-said" title="What You Reported" icon={<Scale size={20} />} readAloud>
        <p className="whitespace-pre-line leading-relaxed text-ink">{report.description}</p>
        {report.occurredOn && (
          <p className="mt-3 text-sm text-slate">It happened on {reportDateFormat.format(report.occurredOn)}.</p>
        )}
        {report.status === "SUBMITTED" && (
          <div className="mt-4 pt-4 border-t border-line">
            <PortalActionButton
              action={withdrawReportAction.bind(null, report.id)}
              variant="danger"
              confirm="Take back this report? It will be removed completely."
              pendingLabel="Withdrawing…"
            >
              Withdraw this report
            </PortalActionButton>
            <p className="mt-2 text-xs text-slate">
              You can take a report back until an executive picks it up.
            </p>
          </div>
        )}
      </DashboardCard>

      {report.attachments.length > 0 && (
        <DashboardCard id="evidence" title="What You Attached" icon={<Paperclip size={20} />}>
          <EvidenceList items={report.attachments} />
        </DashboardCard>
      )}

      <DashboardCard id="updates" title="Everything That's Happened" icon={<ListChecks size={20} />} readAloud>
        <ReportUpdates items={report.updates} filedAt={report.createdAt} />
      </DashboardCard>
    </div>
  );
}
