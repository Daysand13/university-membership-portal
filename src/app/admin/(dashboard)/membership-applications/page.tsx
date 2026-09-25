import { requireCapability } from "@/lib/auth/admin";
import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { filterControlClasses } from "@/components/admin/FilterBar";
import { listApplications } from "@/lib/services/membership-service";
import { deleteApplicationAction } from "@/lib/actions/membership-actions";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { formatFullName } from "@/lib/format";

export const metadata = { title: "Membership Applications" };
export const dynamic = "force-dynamic";

// No "Approved" tab: an approved application already has its own life as a
// Member, managed from /admin/members — surfacing it here too, forever,
// read as a second copy of the same account rather than what it actually
// is (the immutable original-submission record). The rows themselves are
// untouched and still reachable — via "All", via search, or by following a
// Member's original-application link — this only removes the shortcut that
// made them look like part of the day-to-day review queue.
const STATUS_TABS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: ApplicationStatus.PENDING, label: "Pending" },
  { value: ApplicationStatus.UNDER_REVIEW, label: "Under Review" },
  { value: ApplicationStatus.REJECTED, label: "Rejected" },
  { value: ApplicationStatus.SUSPENDED, label: "Suspended" },
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function MembershipApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireCapability("members.applications");
  const { status, q } = await searchParams;
  const applications = await listApplications({
    status: status ? (status as ApplicationStatus) : undefined,
    search: q,
  });

  const columns: Column<(typeof applications)[number]>[] = [
    {
      header: "Applicant",
      cell: (app) => (
        <>
          <p className="font-medium text-primary-950">{formatFullName(app.firstName, app.middleName, app.lastName)}</p>
          <p className="text-xs text-slate-light break-words">{app.email}</p>
        </>
      ),
    },
    { header: "Index Number", cell: (app) => <span className="font-data text-xs text-ink">{app.indexNumber}</span> },
    { header: "Programme", cell: (app) => app.programme },
    { header: "Submitted", cell: (app) => <span className="font-data text-xs">{formatDate(app.submittedAt)}</span> },
    { header: "Status", cell: (app) => <StatusBadge status={app.status} /> },
    {
      header: "Actions",
      actions: true,
      cell: (app) => (
        <>
          <Link
            href={`/admin/membership-applications/${app.id}`}
            className="text-sm font-semibold text-primary-800 hover:text-accent-600 mr-3"
          >
            Review
          </Link>
          {(app.status === ApplicationStatus.REJECTED || app.status === ApplicationStatus.SUSPENDED) && (
            <ConfirmButton
              action={deleteApplicationAction.bind(null, app.id)}
              confirmMessage={`Permanently delete this ${app.status.toLowerCase()} application from ${app.firstName} ${app.lastName}? This also frees up their index number and email for a new application.`}
              className="inline-flex items-center text-danger hover:text-danger align-middle"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span className="sr-only">
                Delete the application from {formatFullName(app.firstName, app.middleName, app.lastName)}
              </span>
            </ConfirmButton>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Membership Applications</h1>
        <p className="text-sm text-slate mt-1">
          {applications.length} application{applications.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end mb-5">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/membership-applications?status=${tab.value}` : "/admin/membership-applications"}
              aria-current={(status ?? "") === tab.value ? "page" : undefined}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                (status ?? "") === tab.value
                  ? "bg-primary-800 text-white border-primary-800"
                  : "border-line text-slate hover:border-primary-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <form className="sm:ml-auto w-full sm:w-72">
          <label htmlFor="applications-q" className="block text-xs font-semibold uppercase tracking-wide text-slate mb-1">
            Search applications
          </label>
          <input
            id="applications-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, index number, email…"
            className={filterControlClasses}
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="No applications found" description="New applications submitted from the enrollment form will appear here." />
      ) : (
        <DataTable caption="Membership applications" rows={applications} rowKey={(app) => app.id} columns={columns} />
      )}
    </div>
  );
}
