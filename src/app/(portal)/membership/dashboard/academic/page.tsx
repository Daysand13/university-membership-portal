import Link from "next/link";
import { BookOpen, FileText, HeartHandshake } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";

export const metadata = { title: "Course & Department" };
export const dynamic = "force-dynamic";

const TRACK_LABEL: Record<string, string> = { UNDERGRADUATE: "Undergraduate", POSTGRADUATE: "Postgraduate" };
const MEMBERSHIP_TYPE_LABEL: Record<string, string> = { REGULAR: "Regular", DISTANCE: "Distance", SANDWICH: "Sandwich" };

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="py-2.5 flex flex-col sm:flex-row sm:gap-4 border-b border-line last:border-0">
      <dt className="text-sm text-slate sm:w-52 shrink-0">{label}</dt>
      <dd className="font-semibold text-primary-950 break-words min-w-0">{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}

export default async function MemberAcademicPage() {
  const member = await requireMember();

  return (
    <>
      <PortalPageHeader
        title="Course & Department"
        description="Your academic details as the association holds them. These are managed by the association — if anything here is wrong, let us know and we'll correct it."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard id="current-studies" title="Current Studies" icon={<BookOpen size={20} />} readAloud className="xl:col-span-2">
          <dl>
            <Row label="Programme" value={member.programme} />
            <Row label="Academic Department" value={member.academicDepartment} />
            <Row label="Study Level" value={member.applicationTrack ? TRACK_LABEL[member.applicationTrack] : null} />
            {member.degreeCategory && <Row label="Degree Category" value={member.degreeCategory} />}
            <Row label="Level" value={member.level} />
            <Row label="Campus" value={member.campus} />
            <Row label="Hall of Affiliation" value={member.hallOfAffiliation} />
            <Row label="Membership Type" value={member.membershipType ? MEMBERSHIP_TYPE_LABEL[member.membershipType] : null} />
            <Row label="Year of Admission" value={member.yearOfAdmission} />
            <Row label="Expected Graduation" value={member.expectedGraduationYear} />
          </dl>
        </DashboardCard>

        <DashboardCard id="support-needs" title="Support Needs" icon={<HeartHandshake size={20} />} readAloud>
          <dl>
            <Row label="Category of Special Needs" value={member.department} />
          </dl>
          {member.specificSupportNeeds.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate mb-1.5">Specific support needed</p>
              <ul className="list-disc pl-5 space-y-1 font-semibold text-primary-950">
                {member.specificSupportNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
            </div>
          )}
        </DashboardCard>

        <DashboardCard id="documents" title="Documents on File" icon={<FileText size={20} />}>
          <ul className="space-y-2.5">
            <li>
              {member.profileImageUrl ? (
                <a
                  href={member.profileImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-800 hover:text-accent-600 underline"
                >
                  View passport picture<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="text-slate">No passport picture on file</span>
              )}
            </li>
            <li>
              {member.medicalReportUrl ? (
                <a
                  href={member.medicalReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-800 hover:text-accent-600 underline"
                >
                  View medical report<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="text-slate">No medical report on file</span>
              )}
            </li>
          </ul>
        </DashboardCard>
      </div>

      <p className="mt-6 text-[15px] text-slate">
        Something not right?{" "}
        <Link
          href="/contact?subject=Correction%20to%20my%20academic%20details"
          className="font-semibold text-primary-800 hover:text-accent-600 underline"
        >
          Ask the association to correct it
        </Link>
        .
      </p>
    </>
  );
}
