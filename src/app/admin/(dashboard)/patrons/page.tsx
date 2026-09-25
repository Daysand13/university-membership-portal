import Link from "next/link";
import { Award } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { filterControlClasses } from "@/components/admin/FilterBar";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
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
  await requireCapability("members.patrons");
  const { status: rawStatus, q, deleted } = await searchParams;
  // Pending first: that's the queue waiting on someone.
  const tab = rawStatus === "ALL" || (rawStatus && STATUSES.has(rawStatus)) ? rawStatus : "PENDING";
  const status = tab === "ALL" ? undefined : (tab as PatronStatus);

  const [patrons, counts] = await Promise.all([listPatrons({ status, search: q }), countPatronsByStatus()]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const columns: Column<(typeof patrons)[number]>[] = [
    {
      header: "Name",
      cell: (p) => (
        <>
          <p className="font-medium text-primary-950">{[p.title, p.fullName].filter(Boolean).join(" ")}</p>
          <p className="text-xs text-slate-light break-words">{p.email}</p>
        </>
      ),
    },
    {
      header: "Work",
      cell: (p) => (
        <>
          {p.occupation}
          {p.organization && <span className="block text-xs text-slate-light">{p.organization}</span>}
        </>
      ),
    },
    { header: "Telephone", cell: (p) => <span className="font-data text-xs text-ink">{p.phone}</span> },
    { header: "Applied", cell: (p) => <span className="font-data text-xs">{formatDate(p.submittedAt)}</span> },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      header: "Actions",
      actions: true,
      cell: (p) => (
        <Link href={`/admin/patrons/${p.id}`} className="text-sm font-semibold text-primary-800 hover:text-accent-600">
          {p.status === "PENDING" ? "Review" : "View"}
          <span className="sr-only"> {[p.title, p.fullName].filter(Boolean).join(" ")}</span>
        </Link>
      ),
    },
  ];

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
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
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
        </nav>
        <form className="sm:ml-auto w-full sm:w-72">
          <input type="hidden" name="status" value={tab} />
          <label htmlFor="patrons-q" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
            Search patrons
          </label>
          <input
            id="patrons-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, email, occupation…"
            className={filterControlClasses}
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
        <DataTable caption="Patrons" rows={patrons} rowKey={(p) => p.id} columns={columns} />
      )}
    </div>
  );
}
