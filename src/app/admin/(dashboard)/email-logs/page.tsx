import Link from "next/link";
import { requireCapability } from "@/lib/auth/admin";
import { Mail, Search } from "lucide-react";
import { EmptyState, inputClasses } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { listEmailLogs } from "@/lib/services/notification-service";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const metadata = { title: "Email Logs" };
export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: "SENT" | "FAILED" | "SKIPPED_NO_PROVIDER" }) {
  const styles: Record<typeof status, string> = {
    SENT: "bg-success-light text-success",
    FAILED: "bg-danger-light text-danger",
    SKIPPED_NO_PROVIDER: "bg-surface-muted text-slate",
  };
  const labels: Record<typeof status, string> = {
    SENT: "Sent",
    FAILED: "Failed",
    SKIPPED_NO_PROVIDER: "No provider (dev)",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function AdminEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability("site.emails");
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const logs = await listEmailLogs(200, term || undefined);
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  const columns: Column<(typeof logs)[number]>[] = [
    { header: "Status", cell: (log) => <StatusBadge status={log.status} /> },
    {
      header: "To",
      cell: (log) => (
        <>
          <span className="text-ink break-words">{log.to}</span>
          {log.status === "FAILED" && log.errorMessage && (
            <span className="block text-xs text-danger mt-0.5">{log.errorMessage}</span>
          )}
        </>
      ),
    },
    { header: "Subject", cell: (log) => log.subject },
    { header: "Template", cell: (log) => <span className="font-data text-xs">{log.template}</span> },
    { header: "Attempts", cell: (log) => log.attempts },
    { header: "When", cell: (log) => <span className="font-data text-xs">{formatDateTime(log.createdAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Email Logs</h1>
        <p className="text-sm text-slate mt-1">
          Every transactional email the system has attempted to send — approvals, rejections, password resets,
          profile updates, and admin notifications — with delivery status, for auditing.
        </p>
        {failedCount > 0 && (
          <p className="text-sm text-danger mt-2 font-medium">
            {failedCount} email{failedCount === 1 ? "" : "s"} failed to send after retries — check RESEND_API_KEY
            and your Resend dashboard.
          </p>
        )}
      </div>

      {/* "They say they never received it" is answered by typing their
          address in here: whether anything was ever attempted, and what
          the provider said if it refused. */}
      <form className="flex flex-col gap-3 mb-5 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="sm:flex-1 sm:min-w-[16rem]">
          <label htmlFor="q" className="block text-sm font-medium text-primary-950 mb-1.5">
            Find by address, subject or template
          </label>
          <input
            id="q"
            name="q"
            defaultValue={term}
            placeholder="e.g. someone@gmail.com"
            className={inputClasses}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">
            <Search size={16} aria-hidden="true" /> Search
          </Button>
          {term && (
            <Link href="/admin/email-logs" className="text-sm font-semibold text-slate hover:text-primary-800">
              Clear
            </Link>
          )}
        </div>
      </form>

      {term && (
        <p className="text-sm text-slate mb-4">
          {logs.length === 0
            ? `Nothing has ever been sent to anything matching "${term}". If that is an address we hold, no email was
               even attempted — which is a different problem from one that was sent and never arrived.`
            : `${logs.length} message${logs.length === 1 ? "" : "s"} matching "${term}".`}
        </p>
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon={<Mail size={28} />}
          title={term ? "Nothing matching that" : "No emails logged yet"}
        />
      ) : (
        <DataTable caption="Emails the system has sent" rows={logs} rowKey={(log) => log.id} columns={columns} />
      )}
    </div>
  );
}
