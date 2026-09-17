import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { listThreadsForAdmin } from "@/lib/services/patron-message-service";
import { PatronsSectionNav } from "@/components/admin/PatronsSectionNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/Common";

export const metadata = { title: "Patron Messages" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPatronMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminRole(AdminRole.MEMBERSHIP_OFFICER);
  const { status: raw } = await searchParams;
  const status = raw === "CLOSED" ? "CLOSED" : raw === "ALL" ? undefined : "OPEN";
  const threads = await listThreadsForAdmin(status);
  const tabs = [
    { value: "OPEN", label: "Open" },
    { value: "CLOSED", label: "Closed" },
    { value: "ALL", label: "All" },
  ];
  const current = raw === "CLOSED" || raw === "ALL" ? raw : "OPEN";

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-primary-950 mb-4">Patrons</h1>
      <PatronsSectionNav current="messages" />
      <p className="text-sm text-slate mb-5 max-w-3xl">
        The Direct Executive Channel: private messages from patrons to the executive committee. Each reply you send is
        also emailed to the patron.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/patrons/messages?status=${t.value}`}
            aria-current={current === t.value ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              current === t.value ? "bg-primary-800 text-white border-primary-800" : "border-line text-slate hover:border-primary-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {threads.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={28} />} title="No conversations" description="Messages from patrons will appear here." />
      ) : (
        <ul className="bg-white rounded-lg border border-line divide-y divide-line">
          {threads.map((thread) => {
            const latest = thread.messages[0];
            const patronName = [thread.patron.title, thread.patron.fullName].filter(Boolean).join(" ");
            return (
              <li key={thread.id}>
                <Link href={`/admin/patrons/messages/${thread.id}`} className="flex items-start gap-3 px-5 py-4 hover:bg-surface-muted/60">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${thread.unreadByAdmin ? "bg-danger" : "bg-transparent"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`text-primary-950 ${thread.unreadByAdmin ? "font-bold" : "font-medium"}`}>{thread.subject}</span>
                      {thread.unreadByAdmin && <span className="text-xs font-semibold text-danger">Needs a reply</span>}
                      {thread.status === "CLOSED" && <StatusBadge status="CLOSED" />}
                    </span>
                    <span className="block text-sm text-slate">
                      {patronName}
                      {thread.patron.organization && `, ${thread.patron.organization}`} → {thread.addressedTo} ·{" "}
                      {dateFormat.format(thread.lastMessageAt)}
                    </span>
                    {latest && (
                      <span className="block text-sm text-ink truncate">
                        {latest.sender === "ADMIN" ? "Team: " : ""}
                        {latest.body}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
