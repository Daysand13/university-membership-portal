import Link from "next/link";
import { Radio } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole, type BroadcastStatus } from "@/generated/prisma/client";
import { countBroadcastsByStatus, listBroadcastsForAdmin } from "@/lib/services/broadcast-service";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { BROADCAST_STATUS_LABELS, broadcastAudienceLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Patron Broadcasts" };
export const dynamic = "force-dynamic";

const TABS: { value: BroadcastStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Awaiting approval" },
  { value: "APPROVED", label: "Sent" },
  { value: "REJECTED", label: "Not approved" },
  { value: "ALL", label: "All" },
];

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminBroadcastsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { status: raw } = await searchParams;
  const tab = TABS.some((t) => t.value === raw) ? (raw as BroadcastStatus | "ALL") : "PENDING";
  const [broadcasts, counts] = await Promise.all([
    listBroadcastsForAdmin(tab === "ALL" ? undefined : tab),
    countBroadcastsByStatus(),
  ]);
  const total = counts.PENDING + counts.APPROVED + counts.REJECTED;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Patrons</h1>
      <PatronsSectionNav current="broadcasts" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Messages patrons want sent to members. Nothing goes out until you approve it; approving posts it to the chosen
        portals and emails the group straight away.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/patrons/broadcasts?status=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label} ({t.value === "ALL" ? total : counts[t.value]})
          </Link>
        ))}
      </div>

      {broadcasts.length === 0 ? (
        <EmptyState icon={<Radio size={28} />} title="Nothing here" description="Broadcasts from patrons will appear here." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Subject</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">From</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">To</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Written</th>
                <th scope="col" className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {broadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5 max-w-xs">
                    <Link href={`/admin/patrons/broadcasts/${b.id}`} className="font-medium text-primary-950 hover:text-accent-600">
                      {b.subject}
                    </Link>
                    <p className="text-xs text-slate">
                      {[b.postToPortal && "Portal", b.sendEmail && "Email"].filter(Boolean).join(" + ")}
                      {b.attachmentName && " · attachment"}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{b.authorName}</td>
                  <td className="px-5 py-3.5 text-slate">{broadcastAudienceLabel(b.audience)}</td>
                  <td className="px-5 py-3.5 text-slate whitespace-nowrap">{dateFormat.format(b.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={b.status} label={BROADCAST_STATUS_LABELS[b.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
