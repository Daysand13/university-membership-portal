import { Receipt } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { DuesCard } from "@/components/dashboard/DuesCard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import {
  formatPesewasAsCedis,
  getCurrentAcademicYear,
  getDuesFeeForMember,
  listDuesPaymentsForMember,
} from "@/lib/services/dues-service";

export const metadata = { title: "Dues & Payments" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const STATUS: Record<string, { label: string; classes: string }> = {
  SUCCESS: { label: "Paid", classes: "bg-success-light text-success" },
  PENDING: { label: "Not completed", classes: "bg-warning-light text-warning" },
  FAILED: { label: "Failed", classes: "bg-danger-light text-danger" },
};

function PaymentStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, classes: "bg-surface-muted text-ink" };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.classes}`}>{s.label}</span>;
}

export default async function MemberDuesPage() {
  const member = await requireMember();
  const academicYear = getCurrentAcademicYear();
  const [fee, payments] = await Promise.all([getDuesFeeForMember(member), listDuesPaymentsForMember(member.id)]);
  const paidThisYear = payments.find((p) => p.academicYear === academicYear && p.status === "SUCCESS") ?? null;

  return (
    <>
      <PortalPageHeader
        title="Dues & Payments"
        description="Pay this year's membership dues securely online, and see every payment you've made."
      />

      <div className="max-w-xl">
        <DuesCard
          academicYear={academicYear}
          amountLabel={formatPesewasAsCedis(paidThisYear ? paidThisYear.amountPesewas : fee.amountPesewas)}
          tierLabel={paidThisYear ? paidThisYear.tierLabel : fee.tierLabel}
          paidAt={paidThisYear?.paidAt ?? null}
        />
      </div>

      <div className="mt-6">
        <DashboardCard id="payment-history" title="Payment History" icon={<Receipt size={20} />}>
          {payments.length === 0 ? (
            <p className="text-slate">You haven&apos;t made any dues payments yet.</p>
          ) : (
            <>
              {/* Phones: one block per payment, so nothing needs sideways scrolling. */}
              <ul className="sm:hidden divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-primary-950">{p.academicYear}</span>
                      <PaymentStatus status={p.status} />
                    </div>
                    <p className="text-sm text-slate mt-1">
                      {formatPesewasAsCedis(p.amountPesewas)} · {p.tierLabel}
                    </p>
                    <p className="text-sm text-slate">
                      {p.paidAt ? `Paid ${dateFormat.format(p.paidAt)}` : `Started ${dateFormat.format(p.createdAt)}`}
                    </p>
                    <p className="text-xs text-slate font-data break-all mt-0.5">Ref: {p.reference}</p>
                  </li>
                ))}
              </ul>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Your dues payments, newest first</caption>
                  <thead>
                    <tr className="text-left text-slate border-b border-line">
                      <th scope="col" className="py-2 pr-4 font-semibold">Academic Year</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Tier</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Amount</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                      <th scope="col" className="py-2 font-semibold">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-line last:border-0">
                        <td className="py-3 pr-4 font-semibold text-primary-950 whitespace-nowrap">{p.academicYear}</td>
                        <td className="py-3 pr-4 text-ink">{p.tierLabel}</td>
                        <td className="py-3 pr-4 text-ink whitespace-nowrap">{formatPesewasAsCedis(p.amountPesewas)}</td>
                        <td className="py-3 pr-4">
                          <PaymentStatus status={p.status} />
                        </td>
                        <td className="py-3 pr-4 text-ink whitespace-nowrap">
                          {dateFormat.format(p.paidAt ?? p.createdAt)}
                        </td>
                        <td className="py-3 text-xs text-slate font-data break-all">{p.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DashboardCard>
      </div>
    </>
  );
}
