import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { listApplications } from "@/lib/services/membership-service";
import { deleteApplicationAction } from "@/lib/actions/membership-actions";
import { ApplicationStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Membership Applications" };
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: ApplicationStatus.PENDING, label: "Pending" },
  { value: ApplicationStatus.UNDER_REVIEW, label: "Under Review" },
  { value: ApplicationStatus.APPROVED, label: "Approved" },
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
  const { status, q } = await searchParams;
  const applications = await listApplications({
    status: status ? (status as ApplicationStatus) : undefined,
    search: q,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Membership Applications</h1>
        <p className="text-sm text-slate mt-1">
          {applications.length} application{applications.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/membership-applications?status=${tab.value}` : "/admin/membership-applications"}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                (status ?? "") === tab.value
                  ? "bg-primary-800 text-white border-primary-800"
                  : "border-line text-slate hover:border-primary-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <form className="ml-auto">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, index number, email…"
            className="w-72 max-w-full rounded-md border border-line bg-white px-3.5 py-1.5 text-sm focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none"
          />
        </form>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="No applications found" description="New applications submitted from the enrollment form will appear here." />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Applicant</th>
                <th className="text-left px-5 py-3 font-semibold">Index Number</th>
                <th className="text-left px-5 py-3 font-semibold">Programme</th>
                <th className="text-left px-5 py-3 font-semibold">Submitted</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-primary-950">
                      {app.firstName} {app.lastName}
                    </p>
                    <p className="text-xs text-slate-light">{app.email}</p>
                  </td>
                  <td className="px-5 py-3.5 font-data text-xs text-ink">{app.indexNumber}</td>
                  <td className="px-5 py-3.5 text-slate">{app.programme}</td>
                  <td className="px-5 py-3.5 text-slate font-data text-xs">{formatDate(app.submittedAt)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
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
                        <Trash2 size={15} />
                      </ConfirmButton>
                    )}
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
