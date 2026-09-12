import type { ReactNode } from "react";

/** The heading at the top of every portal page — the page's one <h1>. */
export function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-primary-950">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-slate max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
