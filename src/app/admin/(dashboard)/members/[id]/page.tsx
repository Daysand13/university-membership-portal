import { requireCapability } from "@/lib/auth/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemberStatusControl } from "@/components/admin/MemberStatusControl";
import { MarkGraduatedControl } from "@/components/admin/MarkGraduatedControl";
import { EditMemberForm } from "@/components/admin/EditMemberForm";
import { db } from "@/lib/db";
import { formatFullName } from "@/lib/format";
import { getAcademicOptions } from "@/lib/services/academic-options-service";
import { getSpecialNeedsCategories } from "@/lib/services/special-needs-category-service";
import { getSiteSettings } from "@/lib/services/content-service";
import { IdCardPanel, type IdCardIssue } from "@/components/admin/IdCardPanel";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { recordCashCvPaymentAction } from "@/lib/actions/cv-actions";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { formatCedis, hasPaidFor, priceOf } from "@/lib/services/document-purchase-service";

export const metadata = { title: "Member Details" };
export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.records");
  const { id } = await params;
  const [member, academicOptions, specialNeedsCategories, settings] = await Promise.all([
    db.member.findUnique({ where: { id }, include: { alumniProfile: true } }),
    getAcademicOptions(),
    getSpecialNeedsCategories(),
    getSiteSettings(),
  ]);
  if (!member) notFound();

  const cvPaid = await hasPaidFor(member.id, PaidDocumentKind.CV);
  const cvPrice = priceOf(PaidDocumentKind.CV);

  // Anything that would make a printed ID card incomplete, said before printing.
  const idCardIssues: IdCardIssue[] = [];
  if (!member.profileImageUrl) {
    idCardIssues.push({ message: "This member has no passport picture on file, so the photo frame will be blank." });
  }
  if (!settings.logoUrl) {
    idCardIssues.push({ message: "The association logo isn't set.", href: "/admin/settings", linkLabel: "Add it in Settings" });
  }
  if (!settings.universityLogoUrl) {
    idCardIssues.push({ message: "The university logo isn't set.", href: "/admin/settings", linkLabel: "Add it in Settings" });
  }
  if (member.status !== "ACTIVE" || member.graduatedAt) {
    idCardIssues.push({
      message: "This member isn't currently active, so the card's QR code will show “Not Verified” when scanned.",
    });
  }

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
            <h1 className="font-display font-bold text-2xl text-primary-950">
              {formatFullName(member.firstName, member.middleName, member.lastName)}
            </h1>
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

      <IdCardPanel
        memberId={member.id}
        memberName={formatFullName(member.firstName, member.middleName, member.lastName)}
        issues={idCardIssues}
        version={`${member.updatedAt.toISOString()}|${settings.logoUrl ?? ""}|${settings.universityLogoUrl ?? ""}`}
      />

      <div className="bg-white rounded-lg border border-line p-6 mb-6">
        <h2 className="font-display font-bold text-base text-primary-950 mb-4">Paid documents</h2>
        {cvPaid ? (
          <p className="text-sm text-ink">
            This member has paid for their CV. They can write it and download it from their own dashboard, as often
            as they like.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate mb-3">
              A CV costs {formatCedis(cvPrice.pesewas)}. Record it here when the money is handed over at the office —
              online payment does the same thing by itself.
            </p>
            <ConfirmButton
              action={recordCashCvPaymentAction.bind(null, member.id)}
              confirmMessage={`Record ${formatCedis(cvPrice.pesewas)} in cash for this member's CV? It unlocks their download straight away.`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
            >
              Record cash payment for a CV
            </ConfirmButton>
          </>
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

      <div className="mb-6">
        <EditMemberForm
          member={member}
          academicOptions={academicOptions}
          specialNeedsCategories={specialNeedsCategories}
        />
      </div>

      <div className="bg-white rounded-lg border border-line p-6">
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
      </div>
    </div>
  );
}
