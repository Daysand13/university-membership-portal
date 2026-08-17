const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PUBLISHED: "bg-success-light text-success",
  ARCHIVED: "bg-slate-100 text-slate-500",
  PENDING: "bg-warning-light text-warning",
  UNDER_REVIEW: "bg-primary-100 text-primary-800",
  APPROVED: "bg-success-light text-success",
  REJECTED: "bg-danger-light text-danger",
  SUSPENDED: "bg-danger-light text-danger",
  ACTIVE: "bg-success-light text-success",
  INACTIVE: "bg-slate-100 text-slate-500",
  NEW: "bg-primary-100 text-primary-800",
  READ: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Under Review",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const label = STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}
