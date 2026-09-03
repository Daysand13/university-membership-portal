import { Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { listEmailLogs } from "@/lib/services/notification-service";

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

export default async function AdminEmailLogsPage() {
  const logs = await listEmailLogs(200);
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

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

      {logs.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title="No emails logged yet" />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">To</th>
                <th className="text-left px-5 py-3 font-semibold">Subject</th>
                <th className="text-left px-5 py-3 font-semibold">Template</th>
                <th className="text-left px-5 py-3 font-semibold">Attempts</th>
                <th className="text-left px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-5 py-3 text-ink">{log.to}</td>
                  <td className="px-5 py-3 text-slate max-w-xs truncate" title={log.subject}>
                    {log.subject}
                  </td>
                  <td className="px-5 py-3 text-slate-light font-data text-xs">{log.template}</td>
                  <td className="px-5 py-3 text-slate-light text-xs">{log.attempts}</td>
                  <td className="px-5 py-3 text-slate-light font-data text-xs whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
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
