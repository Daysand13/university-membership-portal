import Link from "next/link";
import { ClipboardList, MessagesSquare, Radio, Scale, UsersRound } from "lucide-react";
import { countBroadcastsByStatus } from "@/lib/services/broadcast-service";
import { countUnreadThreadsForAdmin } from "@/lib/services/patron-message-service";

export type PatronsSection = "accounts" | "profiles" | "broadcasts" | "messages" | "advocacy";

/**
 * The sections of Admin > Patrons: applications and accounts, the public
 * profiles on the Patrons page, and the Patrons' Portal features the team
 * runs (broadcast approvals, the executive channel, advocacy). Counts show
 * what's waiting.
 */
export async function PatronsSectionNav({
  current,
  showAccounts = true,
}: {
  current: PatronsSection;
  /** Editors manage the public profiles only, not applications or the portal. */
  showAccounts?: boolean;
}) {
  const [broadcasts, unreadThreads] = showAccounts
    ? await Promise.all([countBroadcastsByStatus(), countUnreadThreadsForAdmin()])
    : [null, 0];

  const tabs: { key: PatronsSection; href: string; label: string; icon: typeof Radio; badge?: number }[] = [
    ...(showAccounts
      ? [{ key: "accounts" as const, href: "/admin/patrons", label: "Applications & Accounts", icon: ClipboardList }]
      : []),
    { key: "profiles", href: "/admin/patrons/profiles", label: "Public Profiles", icon: UsersRound },
    ...(showAccounts
      ? [
          {
            key: "broadcasts" as const,
            href: "/admin/patrons/broadcasts",
            label: "Broadcasts",
            icon: Radio,
            badge: broadcasts?.PENDING ?? 0,
          },
          { key: "messages" as const, href: "/admin/patrons/messages", label: "Messages", icon: MessagesSquare, badge: unreadThreads },
          { key: "advocacy" as const, href: "/admin/patrons/advocacy", label: "Advocacy", icon: Scale },
        ]
      : []),
  ];

  return (
    <nav aria-label="Patrons sections" className="mb-6 border-b border-line overflow-x-auto">
      <ul className="flex gap-1 -mb-px min-w-max">
        {tabs.map(({ key, href, label, icon: Icon, badge }) => {
          const active = key === current;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap ${
                  active ? "border-primary-800 text-primary-950" : "border-transparent text-slate hover:text-primary-800"
                }`}
              >
                <Icon size={16} aria-hidden="true" /> {label}
                {badge ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-bold inline-flex items-center justify-center">
                    {badge}
                    <span className="sr-only"> waiting</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
