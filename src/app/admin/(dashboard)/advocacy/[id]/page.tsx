import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ListChecks, Paperclip, Scale, Siren, UserRound } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getBarrierReportForAdmin } from "@/lib/services/barrier-report-service";
import { BarrierTriageForm, EscalateReportForm } from "@/components/admin/forms/ExecutiveForms";
import { EvidenceList, ReportUpdates } from "@/components/student-portal/Display";
import { barrierStatusLabel } from "@/lib/portal-options";
import { issueCategoryLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Barrier Report" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminBarrierReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const [report, admins] = await Promise.all([
    getBarrierReportForAdmin(id),
    db.adminUser.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);
  if (!report) notFound();

  const alreadyEscalated = Boolean(report.escalatedIssueId);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/advocacy" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Escalation Desk
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl text-primary-950 break-words">{report.title}</h1>
          <p className="text-sm text-slate mt-1">
            {barrierStatusLabel(report.status)} · {issueCategoryLabel(report.category)} · filed{" "}
            {dateFormat.format(report.createdAt)}
            {report.location && ` · ${report.location}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <Scale size={18} aria-hidden="true" /> What the student reported
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-ink">{report.description}</p>
            {report.occurredOn && (
              <p className="mt-3 text-sm text-slate">It happened on {dateFormat.format(report.occurredOn)}.</p>
            )}
          </section>

          {report.attachments.length > 0 && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                <Paperclip size={18} aria-hidden="true" /> Evidence
              </h2>
              <p className="text-sm text-slate mb-3">
                Only the student and administrators can open these. They are never shared with the patrons.
              </p>
              <EvidenceList items={report.attachments} />
            </section>
          )}

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <ListChecks size={18} aria-hidden="true" /> Update the student
            </h2>
            <BarrierTriageForm
              reportId={report.id}
              currentStatus={report.status}
              assignedToId={report.assignedToId}
              admins={admins}
            />
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <Siren size={18} aria-hidden="true" /> Escalate to the patrons
            </h2>
            {alreadyEscalated ? (
              <p className="text-sm text-slate">
                Already escalated as{" "}
                <Link
                  href={`/admin/patrons/advocacy/issues/${report.escalatedIssueId}`}
                  className="font-semibold text-primary-800 hover:text-accent-600"
                >
                  {report.escalatedIssue?.title}
                </Link>
                .
              </p>
            ) : (
              <EscalateReportForm
                reportId={report.id}
                suggestedTitle={report.title}
                suggestedSummary={report.description}
                category={report.category}
                location={report.location}
              />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <UserRound size={18} aria-hidden="true" /> Who reported it
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate">Student</dt>
                <dd className="font-semibold text-primary-950">
                  <Link href={`/admin/members/${report.member.id}`} className="hover:text-accent-600">
                    {report.member.firstName} {report.member.lastName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate">Index number</dt>
                <dd className="font-data font-semibold text-primary-950">{report.member.indexNumber}</dd>
              </div>
              <div>
                <dt className="text-slate">Programme</dt>
                <dd className="text-primary-950">
                  {report.member.programme} · Level {report.member.level}
                </dd>
              </div>
              <div>
                <dt className="text-slate">Contact</dt>
                <dd className="text-primary-950 break-words">
                  <a href={`mailto:${report.member.email}`} className="hover:text-accent-600">
                    {report.member.email}
                  </a>
                  <span className="block">{report.member.phone}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-4">History</h2>
            <ReportUpdates items={report.updates} filedAt={report.createdAt} />
          </section>
        </div>
      </div>
    </div>
  );
}
