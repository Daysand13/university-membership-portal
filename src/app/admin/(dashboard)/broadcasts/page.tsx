import Link from "next/link";
import { Radio } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole, type BroadcastAudience } from "@/generated/prisma/client";
import { countBroadcastRecipients, listAdminBroadcasts } from "@/lib/services/broadcast-service";
import { AdminBroadcastComposer } from "@/components/admin/forms/ExecutiveForms";
import { EmptyState } from "@/components/ui/Common";
import { BROADCAST_AUDIENCES, broadcastAudienceLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Broadcasts" };
export const dynamic = "force-dynamic";
// Counting five audiences and then sending to one of them takes longer than
// a default request allows when the association is large.
export const maxDuration = 60;

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

/**
 * The executives' own broadcast engine. Unlike a patron's, this sends
 * immediately — there is nobody above the executive board to approve it —
 * so the composer shows the exact number of recipients before it goes.
 */
export default async function AdminBroadcastComposerPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; to?: string; emails?: string }>;
}) {
  const admin = await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const [{ sent, to, emails }, previous, ...counts] = await Promise.all([
    searchParams,
    listAdminBroadcasts(),
    ...BROADCAST_AUDIENCES.map((audience) => countBroadcastRecipients(audience.value as BroadcastAudience)),
  ]);

  const recipientCounts: Record<string, number> = {};
  BROADCAST_AUDIENCES.forEach((audience, index) => {
    recipientCounts[audience.value] = counts[index] ?? 0;
  });

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-1">Broadcasts</h1>
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Write to students, alumni, the executive board or the patrons. Messages go out as soon as you send them and are
        recorded in the audit log. Patrons&apos; broadcasts, which you approve rather than write, are under{" "}
        <Link href="/admin/patrons/broadcasts" className="font-semibold text-primary-800 hover:text-accent-600">
          Patrons
        </Link>
        .
      </p>

      {sent && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          Sent to {to ?? "0"} recipient{to === "1" ? "" : "s"}
          {emails && emails !== "0" && ` · ${emails} email${emails === "1" ? "" : "s"} delivered`}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Write a broadcast</h2>
          <AdminBroadcastComposer defaultAuthorName={admin.name} recipientCounts={recipientCounts} />
        </section>

        <section className="bg-white rounded-lg border border-line p-6">
          <h2 className="font-display font-bold text-base text-primary-950 mb-4">Recently sent</h2>
          {previous.length === 0 ? (
            <EmptyState
              icon={<Radio size={28} />}
              title="Nothing sent yet"
              description="Broadcasts you send appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {previous.map((broadcast) => (
                <li key={broadcast.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-primary-950 break-words">{broadcast.subject}</p>
                  <p className="text-xs text-slate mt-0.5">
                    {broadcastAudienceLabel(broadcast.audience)} · {broadcast.recipientCount ?? 0} recipient
                    {broadcast.recipientCount === 1 ? "" : "s"} ·{" "}
                    {dateFormat.format(broadcast.sentAt ?? broadcast.createdAt)}
                  </p>
                  <p className="text-xs text-slate">
                    From {broadcast.authorName}
                    {broadcast.createdByAdmin?.name && ` (${broadcast.createdByAdmin.name})`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
