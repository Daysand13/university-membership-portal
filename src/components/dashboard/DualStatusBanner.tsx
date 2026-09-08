import Link from "next/link";
import { Repeat2 } from "lucide-react";

/**
 * Shown on either the member or alumni dashboard when the signed-in person
 * holds BOTH standings — so dual status is visible the moment they land,
 * not something they only discover by noticing a "Choose Portal" screen at
 * login. Links to /portal rather than the other dashboard directly, since
 * that's the one place both options are shown side by side.
 */
export function DualStatusBanner({ otherPortalLabel }: { otherPortalLabel: "Alumni" | "Student" }) {
  return (
    <Link
      href="/portal"
      className="flex items-center gap-3 rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 mb-6 hover:border-accent-500 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
        <Repeat2 size={16} />
      </div>
      <p className="text-sm text-primary-950 flex-1">
        <strong className="font-semibold">You have dual status</strong> — you&apos;re also a{" "}
        {otherPortalLabel === "Alumni" ? "graduate" : "current student"} of the association.
      </p>
      <span className="text-sm font-semibold text-accent-700 group-hover:text-accent-800 shrink-0">
        Switch to {otherPortalLabel} Portal →
      </span>
    </Link>
  );
}
