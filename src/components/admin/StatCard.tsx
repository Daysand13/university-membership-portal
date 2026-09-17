import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /** Without one, the card is a plain figure rather than a link. */
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <>
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
          accent ? "bg-accent-100 text-accent-700" : "bg-primary-50 text-primary-800"
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-primary-950 font-data leading-none break-words">{value}</p>
        <p className="text-xs text-slate mt-1.5">{label}</p>
      </div>
    </>
  );
  const classes = "flex items-center gap-4 bg-white rounded-lg border border-line p-5";

  return href ? (
    <Link href={href} className={`${classes} hover:shadow-[var(--shadow-card-hover)] hover:border-primary-200 transition-all`}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
