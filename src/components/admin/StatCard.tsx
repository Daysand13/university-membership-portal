import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  /**
   * A short line of context under the label. A card with one is laid out
   * top-to-bottom at a fixed height (room for a two-line note), so a grid of
   * them stays perfectly even whatever each one says and however narrow the
   * screen — the text gets the card's full width instead of sharing it with
   * the icon.
   */
  detail?: string;
  /** Without one, the card is a plain figure rather than a link. */
  href?: string;
  accent?: boolean;
}) {
  const icon = (
    <div
      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? "bg-accent-100 text-accent-700" : "bg-primary-50 text-primary-800"
      }`}
    >
      <Icon size={20} />
    </div>
  );

  const content = detail ? (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-3xl font-bold text-primary-950 font-data leading-none break-words pt-1">{value}</p>
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-primary-950 truncate">{label}</p>
      <p className="text-xs text-slate mt-0.5 line-clamp-2 min-h-[2lh]">{detail}</p>
    </>
  ) : (
    <>
      {icon}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-primary-950 font-data leading-none break-words">{value}</p>
        <p className="text-xs text-slate mt-1.5">{label}</p>
      </div>
    </>
  );

  const classes = detail
    ? "flex flex-col h-full bg-white rounded-lg border border-line p-5"
    : "flex items-center gap-4 bg-white rounded-lg border border-line p-5";

  return href ? (
    <Link
      href={href}
      title={detail ? `${label}: ${detail}` : undefined}
      className={`${classes} hover:shadow-[var(--shadow-card-hover)] hover:border-primary-200 transition-all`}
    >
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
