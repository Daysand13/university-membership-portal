import Link from "next/link";
import { ClipboardList, UsersRound } from "lucide-react";

/**
 * The two halves of Admin > Patrons: the applications and accounts people
 * create themselves, and the public profiles shown on the Patrons page.
 */
export function PatronsSectionNav({
  current,
  showAccounts = true,
}: {
  current: "accounts" | "profiles";
  /** Editors manage the public profiles only, not applications. */
  showAccounts?: boolean;
}) {
  const tabs = [
    ...(showAccounts
      ? [{ key: "accounts", href: "/admin/patrons", label: "Applications & Accounts", icon: ClipboardList } as const]
      : []),
    { key: "profiles", href: "/admin/patrons/profiles", label: "Public Profiles", icon: UsersRound } as const,
  ];

  return (
    <nav aria-label="Patrons sections" className="mb-6 border-b border-line">
      <ul className="flex flex-wrap gap-1 -mb-px">
        {tabs.map(({ key, href, label, icon: Icon }) => {
          const active = key === current;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 ${
                  active ? "border-primary-800 text-primary-950" : "border-transparent text-slate hover:text-primary-800"
                }`}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
