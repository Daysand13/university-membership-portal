import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemberStatusControl } from "@/components/admin/MemberStatusControl";
import { MarkGraduatedControl } from "@/components/admin/MarkGraduatedControl";
import { db } from "@/lib/db";

export const metadata = { title: "Member Details" };
export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-light uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.member.findUnique({ where: { id }, include: { alumniProfile: true } });
  if (!member) notFound();

  return (
    <div>
      <Link href="/admin/members" className="inline-flex items-center gap-1 text-sm text-primary-800 font-medium hover:text-accent-600 mb-5">
        <ChevronLeft size={15} /> Back to Members
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <a
            href={member.profileImageUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!member.profileImageUrl}
            className={`w-16 h-16 rounded-full bg-primary-50 border border-line overflow-hidden flex items-center justify-center text-primary-300 shrink-0 ${member.profileImageUrl ? "hover:opacity-80 cursor-zoom-in" : "pointer-events-none"}`}
          >
            {member.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.profileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </a>
          <div>
            <h1 className="font-display font-bold text-2xl text-primary-950">{member.firstName} {member.lastName}</h1>
            <p className="text-sm text-slate font-data">{member.indexNumber}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="bg-white rounded-lg border border-line p-6 mb-6">
        <h2 className="font-display font-bold text-base text-primary-950 mb-4">Account Status</h2>
        <MemberStatusControl memberId={member.id} status={member.status} />
        {member.mustChangePassword && (
          <p className="text-xs text-warning bg-warning-light rounded-md px-3 py-2 mt-4 inline-block">
            This member has not yet changed their temporary password.
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-line p-6 mb-6">
        <h2 className="font-display font-bold text-base text-primary-950 mb-4">Graduation &amp; Alumni Status</h2>
        {member.alumniProfile ? (
          <p className="text-sm text-ink">
            Graduated {member.graduatedAt ? new Date(member.graduatedAt).getFullYear() : ""} — an Alumni Portal
            account was created for this member.{" "}
            <Link href="/admin/alumni" className="font-semibold text-primary-800 hover:text-accent-600">
              View in Alumni list
            </Link>
          </p>
        ) : (
          <MarkGraduatedControl memberId={member.id} defaultYear={member.expectedGraduationYear ?? new Date().getFullYear()} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Contact</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Email" value={member.email} />
            <Field label="Phone" value={member.phone} />
            <Field label="Region" value={member.region} />
            <Field label="Residential Address" value={member.residentialAddress} />
            <Field label="Emergency Contact" value={member.emergencyContactName} />
            <Field label="Emergency Phone" value={member.emergencyContactPhone} />
          </dl>
        </section>
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Academic</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Membership Type" value={member.membershipType} />
            <Field label="Study Level (Track)" value={member.applicationTrack} />
            <Field label="Postgraduate Degree Category" value={member.degreeCategory} />
            <Field label="Academic Department" value={member.academicDepartment} />
            <Field label="Programme" value={member.programme} />
            <Field label="Level" value={member.level} />
            <Field label="Campus" value={member.campus} />
            <Field label="Hall of Affiliation" value={member.hallOfAffiliation} />
          </dl>
        </section>
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Category of Special Needs</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Category" value={member.department} />
          </dl>
          {member.specificSupportNeeds.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">
                Specific Support Needed
              </p>
              <ul className="list-disc list-inside text-sm text-ink space-y-1">
                {member.specificSupportNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Medical Report</h2>
          {member.medicalReportUrl ? (
            <a
              href={member.medicalReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-800 font-medium hover:text-accent-600 underline"
            >
              View uploaded medical report
            </a>
          ) : (
            <p className="text-sm text-slate-light">No medical report on file.</p>
          )}
          <div className="mt-3">
            {member.profileImageUrl ? (
              <a
                href={member.profileImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-800 font-medium hover:text-accent-600 underline"
              >
                View passport picture
              </a>
            ) : (
              <p className="text-sm text-slate-light">No passport picture on file.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
