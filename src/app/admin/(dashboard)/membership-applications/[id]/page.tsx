import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, Mail, GraduationCap, MapPin, ShieldAlert } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApplicationReviewPanel } from "@/components/admin/ApplicationReviewPanel";
import { getApplicationById } from "@/lib/services/membership-service";

export const metadata = { title: "Review Application" };
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-light uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{value || "—"}</dd>
    </div>
  );
}

export default async function ReviewApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await getApplicationById(id);
  if (!application) notFound();

  return (
    <div>
      <Link href="/admin/membership-applications" className="inline-flex items-center gap-1 text-sm text-primary-800 font-medium hover:text-accent-600 mb-5">
        <ChevronLeft size={15} /> Back to Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <a
            href={application.profileImageUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!application.profileImageUrl}
            className={`w-16 h-16 rounded-full bg-primary-50 border border-line overflow-hidden flex items-center justify-center text-primary-300 shrink-0 ${application.profileImageUrl ? "hover:opacity-80 cursor-zoom-in" : "pointer-events-none"}`}
          >
            {application.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={application.profileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </a>
          <div>
            <h1 className="font-display font-bold text-2xl text-primary-950">
              {application.firstName} {application.middleName} {application.lastName}
            </h1>
            <p className="text-sm text-slate font-data">{application.indexNumber}</p>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
              <User size={16} className="text-accent-500" /> Personal Information
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth" value={formatDate(application.dateOfBirth)} />
              <Field label="Gender" value={application.gender} />
              <Field label="Phone" value={application.phone} />
              <Field label="Email" value={application.email} />
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
              <GraduationCap size={16} className="text-accent-500" /> Academic Information
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Membership Type" value={application.membershipType} />
              <Field label="Study Level (Track)" value={application.applicationTrack} />
              <Field label="Postgraduate Degree Category" value={application.degreeCategory} />
              <Field label="Academic Department" value={application.academicDepartment} />
              <Field label="Programme" value={application.programme} />
              <Field label="Level" value={application.level} />
              <Field label="Campus" value={application.campus} />
              <Field label="Hall of Affiliation" value={application.hallOfAffiliation} />
              <Field label="Year of Admission" value={application.yearOfAdmission} />
              <Field label="Expected Graduation" value={application.expectedGraduationYear} />
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
              <ShieldAlert size={16} className="text-accent-500" /> Category of Special Needs
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Category" value={application.department} />
            </dl>
            {application.specificSupportNeeds.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">
                  Specific Support Needed
                </p>
                <ul className="list-disc list-inside text-sm text-ink space-y-1">
                  {application.specificSupportNeeds.map((need) => (
                    <li key={need}>{need}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
              <ShieldAlert size={16} className="text-accent-500" /> Medical Report
            </h2>
            {application.medicalReportUrl ? (
              <a
                href={application.medicalReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-800 font-medium hover:text-accent-600 underline"
              >
                View uploaded medical report
              </a>
            ) : (
              <p className="text-sm text-slate-light">No medical report uploaded.</p>
            )}
            <div className="mt-3">
              {application.profileImageUrl ? (
                <a
                  href={application.profileImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-800 font-medium hover:text-accent-600 underline"
                >
                  View passport picture
                </a>
              ) : (
                <p className="text-sm text-slate-light">No passport picture uploaded.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
              <MapPin size={16} className="text-accent-500" /> Contact & Emergency
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Residential Address" value={application.residentialAddress} />
              <Field label="Region" value={application.region} />
              <Field label="Membership Type" value={application.membershipType} />
              <Field label="Emergency Contact" value={application.emergencyContactName} />
              <Field label="Emergency Phone" value={application.emergencyContactPhone} />
            </dl>
          </section>

          {application.reviewedBy && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-4">
                <ShieldAlert size={16} className="text-accent-500" /> Review History
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Reviewed By" value={application.reviewedBy.name} />
                <Field label="Reviewed On" value={formatDate(application.reviewedAt)} />
              </dl>
              {application.adminNote && (
                <div className="mt-4 bg-surface-muted rounded-md p-3.5">
                  <p className="text-xs text-slate-light uppercase tracking-wide mb-1">Admin Note</p>
                  <p className="text-sm text-ink">{application.adminNote}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-line p-6 sticky top-24">
            <h2 className="font-display font-bold text-base text-primary-950 mb-4">Review Decision</h2>
            <ApplicationReviewPanel applicationId={application.id} currentStatus={application.status} />
          </div>
          {application.member && (
            <div className="mt-4 bg-success-light border border-success/20 rounded-lg p-4 flex items-center gap-2.5">
              <Mail size={16} className="text-success shrink-0" />
              <p className="text-sm text-success">
                A member account exists for this application.{" "}
                <Link href={`/admin/members/${application.member.id}`} className="font-semibold underline">
                  View member
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
