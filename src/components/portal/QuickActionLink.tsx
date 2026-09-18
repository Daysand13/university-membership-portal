import type { ReactNode } from "react";
import Link from "next/link";

/**
 * A single always-there button in the portal header — the student's "Report
 * a barrier" and the graduate's "Give".
 *
 * On narrower screens it collapses to its icon, with the label still read out, so a
 * student who needs it can reach it from any page in the portal without
 * hunting through a menu first.
 */
export function QuickActionLink({
  href,
  icon,
  label,
  tone = "accent",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tone?: "accent" | "primary";
}) {
  const classes =
    tone === "accent"
      ? "bg-accent-500 text-primary-950 hover:bg-accent-400"
      : "bg-primary-800 text-white hover:bg-primary-700";
  return (
    <Link
      href={href}
      title={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full min-h-11 min-w-11 px-3 lg:px-4 text-sm font-semibold whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${classes}`}
    >
      <span aria-hidden="true" className="flex items-center">
        {icon}
      </span>
      {/* Below 1024px the header also holds the menu button and the
          read-aloud/theme controls, and the words don't fit beside them. */}
      <span className="hidden lg:inline">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
    </Link>
  );
}
