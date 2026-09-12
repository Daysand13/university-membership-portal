import Link from "next/link";
import { ClipboardList, FileText, GraduationCap } from "lucide-react";
import { requireAlumni } from "@/lib/auth/alumni";
import { getAlumniStudyRecords } from "@/lib/services/alumni-service";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Academic Records" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const RECORD_STATUS: Record<string, { label: string; classes: string }> = {
  ACTIVE: { label: "In progress", classes: "bg-success-light text-success" },
  GRADUATED: { label: "Completed", classes: "bg-surface-muted text-ink" },
  SUSPENDED: { label: "Suspended", classes: "bg-danger-light text-danger" },
  INACTIVE: { label: "Inactive", classes: "bg-surface-muted text-ink" },
};

const APPLICATION_STATUS: Record<string, string> = {
  PENDING: "Submitted — awaiting review",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
  SUSPENDED: "On hold",
};

const TRACK_LABEL: Record<string, string> = { UNDERGRADUATE: "Undergraduate", POSTGRADUATE: "Postgraduate" };

export default async function AlumniRecordsPage() {
  const alumni = await requireAlumni();
  const { records, furtherStudiesApplications } = await getAlumniStudyRecords(alumni);

  return (
    <>
      <PortalPageHeader
        title="Academic Records"
        description="Your graduation details and every period of study the association has on record for you."
      />

      <div className="space-y-6">
        <DashboardCard id="graduation" title="Graduation" icon={<GraduationCap size={20} />} readAloud>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate">Class Of</dt>
              <dd className="font-semibold text-primary-950">{alumni.graduationYear}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Programme Completed</dt>
              <dd className="font-semibold text-primary-950 break-words">{alumni.programme}</dd>
            </div>
          </dl>
        </DashboardCard>

        <DashboardCard id="study-history" title="Study History" icon={<ClipboardList size={20} />} readAloud>
          {records.length === 0 ? (
            <p className="text-slate">
              There are no study records linked to your alumni account. If you studied with the association before
              the portal existed, your earlier records may not have been added.
            </p>
          ) : (
            <ol className="space-y-4">
              {records.map((record) => {
                const status = RECORD_STATUS[record.status] ?? RECORD_STATUS.INACTIVE;
                return (
                  <li key={record.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="font-semibold text-primary-950 break-words">{record.programme}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.classes}`}>
                        {status.label}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-slate">Index number:</dt>
                        <dd className="font-data text-ink break-all">{record.indexNumber}</dd>
                      </div>
                      {record.track && (
                        <div className="flex gap-2">
                          <dt className="text-slate">Study level:</dt>
                          <dd className="text-ink">{TRACK_LABEL[record.track]}</dd>
                        </div>
                      )}
                      {record.academicDepartment && (
                        <div className="flex gap-2">
                          <dt className="text-slate">Department:</dt>
                          <dd className="text-ink break-words">{record.academicDepartment}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="text-slate">Campus:</dt>
                        <dd className="text-ink">{record.campus}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate">Admitted:</dt>
                        <dd className="text-ink">{record.yearOfAdmission}</dd>
                      </div>
                      {record.graduatedAt ? (
                        <div className="flex gap-2">
                          <dt className="text-slate">Completed:</dt>
                          <dd className="text-ink">{dateFormat.format(record.graduatedAt)}</dd>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <dt className="text-slate">Level:</dt>
                          <dd className="text-ink">{record.level}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
        </DashboardCard>

        {furtherStudiesApplications.length > 0 && (
          <DashboardCard id="further-studies-applications" title="Further Studies Applications" icon={<FileText size={20} />}>
            <ul className="divide-y divide-line">
              {furtherStudiesApplications.map((application) => (
                <li key={application.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold text-primary-950 break-words">{application.programme}</p>
                  <p className="text-sm text-slate">
                    {APPLICATION_STATUS[application.status] ?? application.status} · Submitted{" "}
                    {dateFormat.format(application.submittedAt)} · Index number{" "}
                    <span className="font-data">{application.indexNumber}</span>
                  </p>
                </li>
              ))}
            </ul>
          </DashboardCard>
        )}

        <p className="text-[15px] text-slate">
          Official transcripts and certificates aren&apos;t stored in this portal. If something in your study history
          is missing or wrong,{" "}
          <Link
            href="/contact?subject=Correction%20to%20my%20alumni%20records"
            className="font-semibold text-primary-800 hover:text-accent-600 underline"
          >
            let the association know
          </Link>
          .
        </p>
      </div>
    </>
  );
}
