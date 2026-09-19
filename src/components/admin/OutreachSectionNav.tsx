import Link from "next/link";
import { Inbox, LayoutGrid, MonitorSmartphone, UserPlus } from "lucide-react";
import { countAllySignups } from "@/lib/services/ally-service";
import { countSoftwareRequestsByStatus } from "@/lib/services/assistive-software-service";

/**
 * The two tabs of each outreach page's admin: what's on the public page,
 * and what's come in from it. The badge is what's waiting on someone.
 */
export async function AlliesSectionNav({ current }: { current: "listings" | "signups" }) {
  const counts = await countAllySignups();
  return (
    <SectionTabs
      label="Allies sections"
      current={current}
      tabs={[
        { key: "listings", href: "/admin/allies", label: "Public Listings", icon: LayoutGrid },
        { key: "signups", href: "/admin/allies/signups", label: "Sign-ups", icon: UserPlus, badge: counts.awaitingListing },
      ]}
    />
  );
}

export async function AssistiveTechSectionNav({ current }: { current: "directory" | "requests" }) {
  const counts = await countSoftwareRequestsByStatus();
  return (
    <SectionTabs
      label="Assistive software sections"
      current={current}
      tabs={[
        { key: "directory", href: "/admin/assistive-tech", label: "Directory & Settings", icon: MonitorSmartphone },
        { key: "requests", href: "/admin/assistive-tech/requests", label: "Requests", icon: Inbox, badge: counts.NEW },
      ]}
    />
  );
}

function SectionTabs<K extends string>({
  label,
  current,
  tabs,
}: {
  label: string;
  current: K;
  tabs: { key: K; href: string; label: string; icon: typeof Inbox; badge?: number }[];
}) {
  return (
    <nav aria-label={label} className="mb-6 border-b border-line overflow-x-auto">
      <ul className="flex gap-1 -mb-px min-w-max">
        {tabs.map(({ key, href, label: tabLabel, icon: Icon, badge }) => {
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
                <Icon size={16} aria-hidden="true" /> {tabLabel}
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
