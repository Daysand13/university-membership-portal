import Link from "next/link";
import { BarChart3, FileText, HandHeart, Receipt } from "lucide-react";

export function FinanceSectionNav({
  current,
}: {
  current: "overview" | "donations" | "documents" | "expenses";
}) {
  const tabs = [
    { key: "overview", href: "/admin/finance", label: "Overview", icon: BarChart3 },
    { key: "donations", href: "/admin/finance/donations", label: "Donations", icon: HandHeart },
    { key: "documents", href: "/admin/finance/documents", label: "Documents", icon: FileText },
    { key: "expenses", href: "/admin/finance/expenses", label: "Expenses", icon: Receipt },
  ] as const;
  return (
    <nav aria-label="Finance sections" className="mb-6 border-b border-line overflow-x-auto">
      <ul className="flex gap-1 -mb-px min-w-max">
        {tabs.map(({ key, href, label, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={key === current ? "page" : undefined}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 ${
                key === current ? "border-primary-800 text-primary-950" : "border-transparent text-slate hover:text-primary-800"
              }`}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
