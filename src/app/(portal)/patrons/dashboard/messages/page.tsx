import Link from "next/link";
import { History, Megaphone, MessagesSquare, PenLine, Radio } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { listAllAnnouncements, listBroadcastsForPatron } from "@/lib/services/broadcast-service";
import { listExecutiveContacts, listThreadsForPatron } from "@/lib/services/patron-message-service";
import { withdrawBroadcastAction } from "@/lib/actions/patron-portal-actions";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { BroadcastComposer } from "@/components/patron-portal/BroadcastComposer";
import { ThreadComposer } from "@/components/patron-portal/MessageForms";
import { AnnouncementsList } from "@/components/patron-portal/Display";
import { BROADCAST_STATUS_LABELS, broadcastAudienceLabel } from "@/lib/patron-portal-options";

export const metadata = { title: "Communication Center" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

function Tabs({ current }: { current: "broadcast" | "executive" }) {
  const tabs = [
    { key: "broadcast", href: "/patrons/dashboard/messages", label: "Broadcasts", icon: Radio },
    { key: "executive", href: "/patrons/dashboard/messages?tab=executive", label: "Direct Executive Channel", icon: MessagesSquare },
  ] as const;
  return (
    <nav aria-label="Communication Center sections" className="border-b border-line">
      <ul className="flex flex-wrap gap-1 -mb-px">
        {tabs.map(({ key, href, label, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={current === key ? "page" : undefined}
              className={`inline-flex items-center gap-2 px-4 py-3 min-h-11 text-[15px] font-semibold border-b-2 ${
                current === key ? "border-primary-800 text-primary-950" : "border-transparent text-slate hover:text-primary-800"
              }`}
            >
              <Icon size={17} aria-hidden="true" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function PatronMessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const patron = await requirePatron();
  const { tab } = await searchParams;
  const current = tab === "executive" ? "executive" : "broadcast";

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Communication Center"
        description="Write to members across the association, or privately to the executive committee."
      />
      <Tabs current={current} />
      {current === "broadcast" ? <BroadcastTab patronId={patron.id} /> : <ExecutiveTab patronId={patron.id} />}
    </div>
  );
}

async function BroadcastTab({ patronId }: { patronId: string }) {
  const [mine, announcements] = await Promise.all([listBroadcastsForPatron(patronId), listAllAnnouncements(5)]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
      <section id="compose" aria-labelledby="compose-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6 scroll-mt-24">
        <div className="flex items-center gap-3 mb-5">
          <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-primary-50 text-primary-800 flex items-center justify-center">
            <PenLine size={20} />
          </span>
          <h2 id="compose-heading" className="font-display font-bold text-xl text-primary-950">
            New Broadcast
          </h2>
        </div>
        <BroadcastComposer />
      </section>

      <div className="space-y-6">
        <DashboardCard id="my-broadcasts" title="Your Broadcasts" icon={<History size={20} />}>
          {mine.length === 0 ? (
            <p className="text-slate">Broadcasts you send will appear here with their status.</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((b) => (
                <li key={b.id} className="py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-primary-950 min-w-0 break-words">{b.subject}</p>
                    <StatusBadge status={b.status} label={BROADCAST_STATUS_LABELS[b.status]} />
                  </div>
                  <p className="text-sm text-slate">
                    To {broadcastAudienceLabel(b.audience)} · {dateFormat.format(b.createdAt)}
                    {b.status === "APPROVED" && b.recipientCount !== null && ` · ${b.recipientCount} recipients`}
                  </p>
                  {b.status === "REJECTED" && b.reviewNote && (
                    <p className="mt-1.5 text-sm text-ink bg-surface-muted rounded-md px-3 py-2">
                      <span className="font-semibold">Reason: </span>
                      {b.reviewNote}
                    </p>
                  )}
                  {b.status === "PENDING" && (
                    <ConfirmButton
                      action={withdrawBroadcastAction.bind(null, b.id)}
                      confirmMessage="Withdraw this broadcast? It won't be sent."
                      className="mt-1.5 text-sm font-semibold text-slate hover:text-danger underline"
                    >
                      Withdraw
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard id="recent-announcements" title="Recent Announcements" icon={<Megaphone size={20} />} readAloud>
          <AnnouncementsList
            announcements={announcements}
            collapsed
            emptyText="No patron announcements have been sent yet."
          />
        </DashboardCard>
      </div>
    </div>
  );
}

async function ExecutiveTab({ patronId }: { patronId: string }) {
  const [threads, contacts] = await Promise.all([listThreadsForPatron(patronId), listExecutiveContacts()]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
      <section aria-labelledby="new-thread-heading" className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
        <h2 id="new-thread-heading" className="font-display font-bold text-xl text-primary-950 mb-1">
          Write to the Executive
        </h2>
        <p className="text-sm text-slate mb-5">
          A private conversation for consultation and advice. Replies are emailed to you as well.
        </p>
        <ThreadComposer contacts={contacts} />
      </section>

      <DashboardCard id="threads" title="Your Conversations" icon={<MessagesSquare size={20} />}>
        {threads.length === 0 ? (
          <p className="text-slate">You haven&apos;t written to the executive team yet.</p>
        ) : (
          <ul className="divide-y divide-line -mx-2">
            {threads.map((thread) => {
              const latest = thread.messages[0];
              return (
                <li key={thread.id}>
                  <Link
                    href={`/patrons/dashboard/messages/${thread.id}`}
                    className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-surface-muted"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${thread.unreadByPatron ? "bg-danger" : "bg-transparent"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className={`text-primary-950 ${thread.unreadByPatron ? "font-bold" : "font-semibold"}`}>
                          {thread.subject}
                        </span>
                        {thread.unreadByPatron && <span className="text-xs font-semibold text-danger">New reply</span>}
                        {thread.status === "CLOSED" && <StatusBadge status="CLOSED" />}
                      </span>
                      <span className="block text-sm text-slate">
                        To {thread.addressedTo} · {dateFormat.format(thread.lastMessageAt)} · {thread._count.messages} message
                        {thread._count.messages === 1 ? "" : "s"}
                      </span>
                      {latest && (
                        <span className="block text-sm text-ink truncate">
                          {latest.sender === "ADMIN" ? "Executive: " : "You: "}
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
      </DashboardCard>
    </div>
  );
}
