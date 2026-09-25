import { requireCapability } from "@/lib/auth/admin";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { listAuditLog } from "@/lib/services/notification-service";
import { DataTable, type Column } from "@/components/admin/DataTable";

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
  await requireCapability("site.audit");
  const logs = await listAuditLog(200);

  const columns: Column<(typeof logs)[number]>[] = [
    { header: "Admin", cell: (log) => <span className="text-ink">{log.admin?.name ?? "System"}</span> },
    { header: "Action", cell: (log) => <span className="text-ink">{describeAction(log.action)}</span> },
    {
      header: "Entity",
      cell: (log) => (
        <>
          {log.entityType}
          {log.entityId && <span className="font-data text-xs text-slate-light"> · {log.entityId.slice(0, 8)}</span>}
        </>
      ),
    },
    { header: "Note", cell: (log) => log.note ?? "—" },
    { header: "When", cell: (log) => <span className="font-data text-xs">{formatDateTime(log.createdAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Audit Log</h1>
        <p className="text-sm text-slate mt-1">A record of sensitive admin actions — approvals, rejections, status changes.</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={28} />} title="No activity recorded yet" />
      ) : (
        <DataTable caption="Admin actions" rows={logs} rowKey={(log) => log.id} columns={columns} />
      )}
    </div>
  );
}
