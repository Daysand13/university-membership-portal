import { requireMember } from "@/lib/auth/member";
import { MemberDashboardView } from "@/components/portal/MemberDashboardView";
import { formatFullName } from "@/lib/format";
import { getLatestNews } from "@/lib/services/news-service";
import { getMemberCardQr } from "@/lib/services/member-card-service";
import {
  getCurrentAcademicYear,
  getDuesFeeForMember,
  getLatestDuesPayment,
  formatPesewasAsCedis,
} from "@/lib/services/dues-service";

export const metadata = { title: "Student Portal" };
export const dynamic = "force-dynamic";

export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dues?: string; passwordChanged?: string }>;
}) {
  const member = await requireMember();
  const sp = await searchParams;
  const academicYear = getCurrentAcademicYear();

  const [duesFee, duesPayment, news, card] = await Promise.all([
    getDuesFeeForMember(member),
    getLatestDuesPayment(member.id, academicYear),
    getLatestNews(4),
    // A QR code that can't be drawn shouldn't take the dashboard down with it.
    getMemberCardQr(member.id).catch((err) => {
      console.error("[member-dashboard] could not build the membership card QR code", err);
      return null;
    }),
  ]);
  const duesPaid = duesPayment?.status === "SUCCESS" ? duesPayment : null;
  const duesNotice = sp.dues === "success" || sp.dues === "failed" || sp.dues === "error" ? sp.dues : undefined;

  return (
    <MemberDashboardView
      member={{
        firstName: member.firstName,
        fullName: formatFullName(member.firstName, member.middleName, member.lastName),
        indexNumber: member.indexNumber,
        departmentLabel: member.academicDepartment ? "Department" : "Programme",
        department: member.academicDepartment ?? member.programme,
        level: member.level,
        status: member.status,
        memberSince: member.createdAt,
        profileImageUrl: member.profileImageUrl,
        mustChangePassword: member.mustChangePassword,
      }}
      notices={{ dues: duesNotice, passwordChanged: sp.passwordChanged === "1" }}
      dues={{
        academicYear,
        amountLabel: formatPesewasAsCedis(duesPaid ? duesPaid.amountPesewas : duesFee.amountPesewas),
        tierLabel: duesPaid ? duesPaid.tierLabel : duesFee.tierLabel,
        paidAt: duesPaid?.paidAt ?? null,
      }}
      news={news}
      card={card ? { qrSvg: card.svg } : null}
    />
  );
}
