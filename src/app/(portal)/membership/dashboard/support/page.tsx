import { HandHeart, LifeBuoy } from "lucide-react";
import { requireMember } from "@/lib/auth/member";
import { listSupportRequestsForMember } from "@/lib/services/support-request-service";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PortalActionButton, SupportRequestForm } from "@/components/student-portal/Forms";
import { withdrawSupportRequestAction } from "@/lib/actions/student-portal-actions";
import { reportDateFormat } from "@/components/student-portal/Display";
import { formatCedis } from "@/lib/patron-portal-options";
import { supportRequestTypeLabel, supportStatusLabel } from "@/lib/portal-options";

export const metadata = { title: "Support & Assistance" };
export const dynamic = "force-dynamic";

/**
 * Asking the association for help: assistive technology, a note-taker, or
 * the emergency welfare fund — and what happened to each request.
 */
export default async function StudentSupportPage() {
  const member = await requireMember();
  const requests = await listSupportRequestsForMember(member.id);

  return (
    <>
      <PortalPageHeader
        title="Support & Assistance"
        description="Ask the association for what you need to study on equal terms. Requests go to the executives, who decide and write back — you'll see every decision here."
      />

      <div className="grid gap-6 xl:grid-cols-2 items-start">
        <DashboardCard id="new-request" title="Ask for Support" icon={<LifeBuoy size={20} />}>
          <SupportRequestForm />
        </DashboardCard>

        <DashboardCard id="my-requests" title="Your Requests" icon={<HandHeart size={20} />} readAloud>
          {requests.length === 0 ? (
            <p className="text-slate">
              You haven&apos;t asked for anything yet. There&apos;s no limit and no penalty — that&apos;s what the
              association is for.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((request) => (
                <li key={request.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                    <p className="font-semibold text-primary-950 min-w-0">{supportRequestTypeLabel(request.type)}</p>
                    <StatusBadge
                      status={request.status === "FULFILLED" ? "APPROVED" : request.status}
                      label={supportStatusLabel(request.status)}
                    />
                  </div>
                  <p className="text-xs text-slate mt-0.5">
                    Asked {reportDateFormat.format(request.createdAt)}
                    {request.amountRequestedPesewas && <> · {formatCedis(request.amountRequestedPesewas)} requested</>}
                    {request.neededBy && <> · needed by {reportDateFormat.format(request.neededBy)}</>}
                  </p>
                  <p className="text-sm text-ink mt-1.5 whitespace-pre-line">{request.details}</p>

                  {request.reviewNote && (
                    <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink">
                      <span className="font-semibold">
                        {request.reviewedBy?.name ? `${request.reviewedBy.name}:` : "The executives:"}
                      </span>{" "}
                      {request.reviewNote}
                    </p>
                  )}
                  {request.approvedAmountPesewas !== null && request.approvedAmountPesewas > 0 && (
                    <p className="mt-2 text-sm font-semibold text-success">
                      {formatCedis(request.approvedAmountPesewas)} approved
                      {request.fulfilledAt && <> · paid out {reportDateFormat.format(request.fulfilledAt)}</>}
                    </p>
                  )}

                  {request.status === "SUBMITTED" && (
                    <div className="mt-3">
                      <PortalActionButton
                        action={withdrawSupportRequestAction.bind(null, request.id)}
                        variant="danger"
                        confirm="Take back this request?"
                        pendingLabel="Withdrawing…"
                      >
                        Withdraw
                      </PortalActionButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </>
  );
}
