import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Paperclip } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { countBroadcastRecipients, getBroadcastForAdmin } from "@/lib/services/broadcast-service";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RichText } from "@/components/ui/RichText";
import { BroadcastReviewForm } from "@/components/admin/BroadcastReviewForm";
import { BROADCAST_STATUS_LABELS, broadcastAudienceLabel, formatFileSize } from "@/lib/patron-portal-options";

export const metadata = { title: "Review Broadcast" };
export const dynamic = "force-dynamic";
// Approving sends the emails from this page's action.
export const maxDuration = 120;

const dateTime = new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2">
      <dt className="text-sm text-slate sm:w-36 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-primary-950 min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminBroadcastPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviewed?: string }>;
}) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { id } = await params;
  const { reviewed } = await searchParams;
  const broadcast = await getBroadcastForAdmin(id);
  if (!broadcast) notFound();
  const pending = broadcast.status === "PENDING";
  const recipients = pending ? await countBroadcastRecipients(broadcast.audience) : broadcast.recipientCount ?? 0;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/patrons/broadcasts" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Broadcasts
      </Link>

      {reviewed === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          {broadcast.status === "APPROVED"
            ? broadcast.sendEmail
              ? `Approved and sent. ${broadcast.emailsSent ?? 0} of ${broadcast.recipientCount ?? 0} emails were accepted for delivery; the patron has been told.`
              : `Approved and posted for ${broadcast.recipientCount ?? 0} members; the patron has been told.`
            : "Declined. The patron has been emailed your reason."}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">{broadcast.subject}</h1>
        <StatusBadge status={broadcast.status} label={BROADCAST_STATUS_LABELS[broadcast.status]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-3">Message as members will see it</p>
          <RichText html={broadcast.bodyHtml} />
          <p className="mt-5 font-semibold text-primary-950">
            {broadcast.authorName}
            <span className="block font-normal text-sm text-slate">Patron</span>
          </p>
          {broadcast.attachmentKey && (
            <a
              href={`/api/broadcasts/${broadcast.id}/attachment`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
            >
              <Paperclip size={15} aria-hidden="true" /> {broadcast.attachmentName}
              {broadcast.attachmentSize ? ` (${formatFileSize(broadcast.attachmentSize)})` : ""}
            </a>
          )}
        </section>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-line p-6">
            <h2 className="font-display font-bold text-base text-primary-950 mb-2">Details</h2>
            <dl className="divide-y divide-line">
              <Row label="From">
                {broadcast.patron ? (
                  <Link href={`/admin/patrons/${broadcast.patron.id}`} className="text-primary-800 hover:text-accent-600">
                    {broadcast.authorName}
                  </Link>
                ) : (
                  `${broadcast.authorName} (account removed)`
                )}
              </Row>
              <Row label="To">
                {broadcastAudienceLabel(broadcast.audience)} · {recipients} {pending ? "would receive it" : "received it"}
              </Row>
              <Row label="Sent as">{[broadcast.postToPortal && "Portal announcement", broadcast.sendEmail && "Email"].filter(Boolean).join(" and ")}</Row>
              <Row label="Written">{dateTime.format(broadcast.createdAt)}</Row>
              {broadcast.reviewedAt && (
                <Row label="Reviewed">
                  {dateTime.format(broadcast.reviewedAt)}
                  {broadcast.reviewedBy && ` by ${broadcast.reviewedBy.name}`}
                </Row>
              )}
              {broadcast.reviewNote && <Row label="Note">{broadcast.reviewNote}</Row>}
              {broadcast.status === "APPROVED" && broadcast.sendEmail && (
                <Row label="Emails">
                  {broadcast.emailsSent ?? 0} of {broadcast.recipientCount ?? 0} accepted ·{" "}
                  <Link href="/admin/email-logs" className="text-primary-800 hover:text-accent-600">
                    Email logs
                  </Link>
                </Row>
              )}
            </dl>
          </section>

          {pending && (
            <section className="bg-white rounded-lg border border-line p-6">
              <h2 className="font-display font-bold text-base text-primary-950 mb-1">Decision</h2>
              <p className="text-sm text-slate mb-4">
                Check the message is appropriate and accurate. Approving sends it immediately.
              </p>
              <BroadcastReviewForm broadcastId={broadcast.id} recipientCount={recipients} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
