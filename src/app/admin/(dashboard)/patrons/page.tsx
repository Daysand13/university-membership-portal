import Link from "next/link";
import { Award } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole, type PatronStatus } from "@/generated/prisma/client";
import { countPatronsByStatus, listPatrons } from "@/lib/services/patron-service";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";

export const metadata = { title: "Patrons" };
export const dynamic = "force-dynamic";

const TABS: { value: PatronStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ALL", label: "All" },
];

const STATUSES = new Set<string>(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AdminPatronsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; deleted?: string }>;
}) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { status: rawStatus, q, deleted } = await searchParams;
  // Pending first: that's the queue waiting on someone.
  const tab = rawStatus === "ALL" || (rawStatus && STATUSES.has(rawStatus)) ? rawStatus : "PENDING";
  const status = tab === "ALL" ? undefined : (tab as PatronStatus);

  const [patrons, counts] = await Promise.all([listPatrons({ status, search: q }), countPatronsByStatus()]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-bold text-2xl text-primary-950">Patrons</h1>
      </div>
      <PatronsSectionNav current="accounts" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        Applications from the public Patrons page, and the patron accounts they become. Approving one lets that person
        sign in to the Patrons&apos; Portal, and every decision is emailed to them. To show a patron on the public
        Patrons page, add their profile under Public Profiles.
      </p>

      {deleted === "1" && (
        <div role="status" className="mb-5 rounded-lg border border-success bg-success-light text-success px-4 py-3 text-sm font-medium">
          The patron has been deleted.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const count = t.value === "ALL" ? total : counts[t.value];
            return (
              <Link
                key={t.value}
                href={`/admin/patrons?status=${t.value}`}
                aria-current={tab === t.value ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  tab === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
                }`}
              >
                {t.label} ({count})
              </Link>
            );
          })}
        </div>
        <form className="ml-auto">
          <input type="hidden" name="status" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Search patrons"
            placeholder="Search by name, email, occupation…"
            className="w-72 max-w-full rounded-md border border-line bg-white px-3.5 py-1.5 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
          />
        </form>
      </div>

      {patrons.length === 0 ? (
        <EmptyState
          icon={<Award size={28} />}
          title="No patrons here"
          description="Applications submitted from the public Patrons page appear here."
        />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Work</th>
                <th className="text-left px-5 py-3 font-semibold">Telephone</th>
                <th className="text-left px-5 py-3 font-semibold">Applied</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {patrons.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-primary-950">{[p.title, p.fullName].filter(Boolean).join(" ")}</p>
                    <p className="text-xs text-slate-light">{p.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate">
                    {p.occupation}
                    {p.organization && <span className="block text-xs text-slate-light">{p.organization}</span>}
                  </td>
                  <td className="px-5 py-3.5 font-data text-xs text-ink">{p.phone}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{formatDate(p.submittedAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/patrons/${p.id}`} className="text-sm font-semibold text-primary-800 hover:text-accent-600">
                      {p.status === "PENDING" ? "Review" : "View"}
                    </Link>
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
