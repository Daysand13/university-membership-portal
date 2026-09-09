import Link from "next/link";
import { Repeat2 } from "lucide-react";

/**
 * Shown on either the member or alumni dashboard when the signed-in person
 * holds BOTH standings — so dual status is visible the moment they land,
 * not something they only discover by noticing a "Choose Portal" screen at
 * login.
 *
 * `canSwitch` is separate from showing the badge on purpose. Switching goes
 * through /portal, which needs the unified session; someone signed in via
 * the older member-only or alumni-only login doesn't have one and would be
 * bounced to a login screen. They should still be told they're dual — they
 * are — so in that case this renders as a plain notice rather than dangling
 * a link that dead-ends.
 */
export function DualStatusBanner({
  otherPortalLabel,
  canSwitch,
}: {
  otherPortalLabel: "Alumni" | "Student";
  canSwitch: boolean;
}) {
  const shared = "flex items-center gap-3 rounded-lg border border-accent-300 bg-accent-50 px-4 py-3 mb-6";

  const body = (
    <>
      <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
        <Repeat2 size={16} />
      </div>
      <p className="text-sm text-primary-950 flex-1">
        <strong className="font-semibold">You have dual status</strong> — you&apos;re also a{" "}
        {otherPortalLabel === "Alumni" ? "graduate" : "current student"} of the association.
      </p>
    </>
  );

  if (!canSwitch) {
    return <div className={shared}>{body}</div>;
  }

  return (
    <Link href="/portal" className={`${shared} hover:border-accent-500 transition-colors group`}>
      {body}
      <span className="text-sm font-semibold text-accent-700 group-hover:text-accent-800 shrink-0">
        Switch to {otherPortalLabel} Portal →
      </span>
    </Link>
  );
}
