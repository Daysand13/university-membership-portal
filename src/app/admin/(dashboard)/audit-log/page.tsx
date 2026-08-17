import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { listAuditLog } from "@/lib/services/notification-service";

export const metadata = { title: "Audit Log" };
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

function describeAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default async function AuditLogPage() {
  const logs = await listAuditLog(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Audit Log</h1>
        <p className="text-sm text-slate mt-1">A record of sensitive admin actions — approvals, rejections, status changes.</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={28} />} title="No activity recorded yet" />
      ) : (
        <div className="bg-white rounded-lg border border-line overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-slate uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Admin</th>
                <th className="text-left px-5 py-3 font-semibold">Action</th>
                <th className="text-left px-5 py-3 font-semibold">Entity</th>
                <th className="text-left px-5 py-3 font-semibold">Note</th>
                <th className="text-left px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted/60">
                  <td className="px-5 py-3 text-ink">{log.admin?.name ?? "System"}</td>
                  <td className="px-5 py-3 text-ink">{describeAction(log.action)}</td>
                  <td className="px-5 py-3 text-slate">
                    {log.entityType}
                    {log.entityId && <span className="font-data text-xs text-slate-light"> · {log.entityId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-5 py-3 text-slate max-w-xs truncate">{log.note ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-light font-data text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
