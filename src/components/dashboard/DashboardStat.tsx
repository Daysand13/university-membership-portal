import type { ComponentType } from "react";

/** One stat in the header strip at the top of a member/alumni dashboard. */
export function DashboardStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-light leading-none">{label}</p>
        <p className="text-sm font-semibold text-primary-950 truncate leading-tight mt-1">{value}</p>
      </div>
    </div>
  );
}
