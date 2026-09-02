import { User, GraduationCap, Mail, MapPin, ShieldCheck } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemberProfileForm } from "@/components/forms/MemberProfileForm";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default async function MemberDashboardPage() {
  const member = await requireMember();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-lg border border-line p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-50 mx-auto overflow-hidden flex items-center justify-center text-primary-300 border border-line">
            {member.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <h2 className="mt-4 font-display font-bold text-lg text-primary-950">
            {member.firstName} {member.lastName}
          </h2>
          <p className="text-sm text-slate font-data">{member.indexNumber}</p>
          <div className="mt-3">
            <StatusBadge status={member.status} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-line p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Academic</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2.5">
              <GraduationCap size={16} className="text-primary-700 shrink-0 mt-0.5" />
              <div>
                <dt className="text-slate-light text-xs">Programme</dt>
                <dd className="text-ink">{member.programme}</dd>
              </div>
            </div>
            <div>
              <dt className="text-slate-light text-xs">Academic Department</dt>
              <dd className="text-ink">{member.academicDepartment ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-light text-xs">Category of Special Needs</dt>
              <dd className="text-ink">{member.department}</dd>
            </div>
            <div className="flex gap-6">
              <div>
                <dt className="text-slate-light text-xs">Level</dt>
                <dd className="text-ink">{member.level}</dd>
              </div>
              <div>
                <dt className="text-slate-light text-xs">Campus</dt>
                <dd className="text-ink">{member.campus}</dd>
              </div>
            </div>
            {member.hallOfAffiliation && (
              <div>
                <dt className="text-slate-light text-xs">Hall of Affiliation</dt>
                <dd className="text-ink">{member.hallOfAffiliation}</dd>
              </div>
            )}
            {member.membershipType && (
              <div>
                <dt className="text-slate-light text-xs">Membership Type</dt>
                <dd className="text-ink">{member.membershipType}</dd>
              </div>
            )}
            {member.specificSupportNeeds.length > 0 && (
              <div>
                <dt className="text-slate-light text-xs mb-1">Specific Support Needed</dt>
                <dd className="text-ink">
                  <ul className="list-disc list-inside space-y-0.5">
                    {member.specificSupportNeeds.map((need) => (
                      <li key={need}>{need}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {member.medicalReportUrl && (
          <div className="bg-white rounded-lg border border-line p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Medical Report</h3>
            <a
              href={member.medicalReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-800 font-medium hover:text-accent-600 underline"
            >
              View uploaded medical report
            </a>
          </div>
        )}

        <div className="bg-white rounded-lg border border-line p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate mb-4">Account</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2.5">
              <Mail size={16} className="text-primary-700 shrink-0 mt-0.5" />
              <dd className="text-ink break-all">{member.email}</dd>
            </div>
            <div className="flex gap-2.5">
              <ShieldCheck size={16} className="text-primary-700 shrink-0 mt-0.5" />
              <dd className="text-ink">Member since {formatDate(member.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg border border-line p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={18} className="text-accent-500" />
            <h2 className="font-display font-bold text-lg text-primary-950">Contact Details</h2>
          </div>
          <p className="text-sm text-slate mb-6">
            You can update your contact information below. Academic and index number details are managed by
            the association — contact us if anything there needs to change.
          </p>
          <MemberProfileForm member={member} />
        </div>
      </div>
    </div>
  );
}
