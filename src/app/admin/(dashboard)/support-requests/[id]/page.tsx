import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, ChevronLeft, LifeBuoy, UserRound } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getSupportRequestForAdmin } from "@/lib/services/support-request-service";
import { SupportPayoutForm, SupportReviewForm } from "@/components/admin/forms/ExecutiveForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCedis } from "@/lib/patron-portal-options";
import { supportRequestTypeLabel, supportStatusLabel } from "@/lib/portal-options";

export const metadata = { title: "Support Request" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminSupportRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const request = await getSupportRequestForAdmin(id);
  if (!request) notFound();

  const studentName = `${request.member.firstName} ${request.member.lastName}`;
  const decided = request.status === "APPROVED" || request.status === "DECLINED" || request.status === "FULFILLED";

  return (
    <div className="max-w-5xl">
      <Link
        href="/admin/support-requests"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4"
      >
        <ChevronLeft size={16} aria-hidden="true" /> Support Requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{supportRequestTypeLabel(request.type)}</h1>
        <StatusBadge
          status={request.status === "FULFILLED" ? "APPROVED" : request.status}
          label={supportStatusLabel(request.status)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
              <LifeBuoy size={18} aria-hidden="true" /> What was asked for
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-ink">{request.details}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-slate">Asked on</dt>
                <dd className="font-semibold text-primary-950">{dateFormat.format(request.createdAt)}</dd>
              </div>
              {request.amountRequestedPesewas !== null && (
                <div>
                  <dt className="text-slate">Amount asked for</dt>
                  <dd className="font-semibold text-primary-950">{formatCedis(request.amountRequestedPesewas)}</dd>
                </div>
              )}
              {request.neededBy && (
                <div>
                  <dt className="text-slate">Needed by</dt>
                  <dd className="font-semibold text-primary-950">{dateFormat.format(request.neededBy)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-3">
              {decided ? "Change the decision" : "Decide"}
            </h2>
            {decided && (
              <p className="mb-4 rounded-lg bg-surface-muted px-3.5 py-3 text-sm text-ink">
                {supportStatusLabel(request.status)}
                {request.reviewedBy?.name && ` by ${request.reviewedBy.name}`}
                {request.reviewedAt && ` on ${dateFormat.format(request.reviewedAt)}`}
                {request.reviewNote && <span className="block mt-1">&ldquo;{request.reviewNote}&rdquo;</span>}
              </p>
            )}
            {request.status === "FULFILLED" ? (
              <p className="text-sm text-slate">
                This has been provided for and recorded in the ledger — there&apos;s nothing left to decide.
              </p>
            ) : (
              <SupportReviewForm
                requestId={request.id}
                requestedPesewas={request.amountRequestedPesewas}
                studentFirstName={request.member.firstName}
              />
            )}
          </section>

          {request.status === "APPROVED" && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
                <Banknote size={18} aria-hidden="true" /> Record the payout
              </h2>
              <SupportPayoutForm
                requestId={request.id}
                type={request.type}
                approvedPesewas={request.approvedAmountPesewas}
                studentName={studentName}
              />
            </section>
          )}

          {request.expense && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="font-display font-bold text-base text-primary-950 mb-2">In the ledger</h2>
              <p className="text-sm text-ink">
                {formatCedis(request.expense.amountPesewas)} — {request.expense.description}, recorded against{" "}
                {dateFormat.format(request.expense.spentOn)}.
              </p>
              <Link
                href="/admin/finance/expenses"
                className="mt-2 inline-flex text-sm font-semibold text-primary-800 hover:text-accent-600"
              >
                Open the expense ledger
              </Link>
            </section>
          )}
        </div>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-base text-primary-950 mb-3">
            <UserRound size={18} aria-hidden="true" /> Who asked
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate">Student</dt>
              <dd className="font-semibold text-primary-950">
                <Link href={`/admin/members/${request.member.id}`} className="hover:text-accent-600">
                  {studentName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-slate">Index number</dt>
              <dd className="font-data font-semibold text-primary-950">{request.member.indexNumber}</dd>
            </div>
            <div>
              <dt className="text-slate">Programme</dt>
              <dd className="text-primary-950">
                {request.member.programme} · Level {request.member.level}
              </dd>
            </div>
            <div>
              <dt className="text-slate">Contact</dt>
              <dd className="text-primary-950 break-words">
                <a href={`mailto:${request.member.email}`} className="hover:text-accent-600">
                  {request.member.email}
                </a>
                <span className="block">{request.member.phone}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
