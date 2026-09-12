import type { ReactNode } from "react";
import { ReadAloudButton } from "./ReadAloudButton";

/**
 * One widget on a portal dashboard. A labelled <section>, so a screen reader
 * user can jump between cards by heading or landmark, with an optional
 * "Listen" control that reads just this card's content aloud.
 */
export function DashboardCard({
  id,
  title,
  icon,
  readAloud = false,
  footer,
  children,
  className = "",
}: {
  /** Unique on the page; used to wire up the heading and read-aloud target. */
  id: string;
  title: string;
  icon: ReactNode;
  readAloud?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  const bodyId = `${id}-body`;

  return (
    <section
      aria-labelledby={headingId}
      className={`bg-white rounded-xl border border-line shadow-card flex flex-col min-w-0 ${className}`}
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span
          aria-hidden="true"
          className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center shrink-0"
        >
          {icon}
        </span>
        <h2 id={headingId} className="font-display font-bold text-lg text-primary-950 flex-1 min-w-0 leading-snug">
          {title}
        </h2>
        {readAloud && <ReadAloudButton targetId={bodyId} label={title} />}
      </div>
      <div id={bodyId} className="px-5 pb-5 flex-1 text-[15px] leading-relaxed text-ink">
        {children}
      </div>
      {footer && <div className="px-5 py-3.5 border-t border-line text-sm">{footer}</div>}
    </section>
  );
}
