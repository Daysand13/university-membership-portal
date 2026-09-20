import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { openThreadForAdmin } from "@/lib/services/patron-message-service";
import { adminReplyToThreadAction, setThreadStatusAction } from "@/lib/actions/patron-admin-actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Conversation } from "@/components/patron-portal/Conversation";
import { ThreadReplyForm } from "@/components/patron-portal/MessageForms";

export const metadata = { title: "Patron Conversation" };
export const dynamic = "force-dynamic";

export default async function AdminPatronThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCapability("members.patrons");
  const { id } = await params;
  const thread = await openThreadForAdmin(id);
  if (!thread) notFound();
  const patronName = [thread.patron.title, thread.patron.fullName].filter(Boolean).join(" ");
  const closed = thread.status === "CLOSED";

  return (
    <div className="max-w-4xl">
      <Link href="/admin/patrons/messages" className="inline-flex items-center gap-1 text-sm text-slate hover:text-primary-800 mb-4">
        <ChevronLeft size={16} aria-hidden="true" /> Messages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary-950">{thread.subject}</h1>
          <p className="text-sm text-slate mt-1">
            From{" "}
            <Link href={`/admin/patrons/${thread.patron.id}`} className="font-semibold text-primary-800 hover:text-accent-600">
              {patronName}
            </Link>
            {[thread.patron.jobTitle, thread.patron.organization].filter(Boolean).length > 0 &&
              ` (${[thread.patron.jobTitle, thread.patron.organization].filter(Boolean).join(", ")})`}{" "}
            to {thread.addressedTo}
          </p>
          <p className="text-sm text-slate">
            {thread.patron.email} · {thread.patron.phone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={thread.status} />
          <ConfirmButton
            action={setThreadStatusAction.bind(null, thread.id, closed ? "OPEN" : "CLOSED")}
            confirmMessage={closed ? "Reopen this conversation?" : "Mark this conversation as closed? The patron can still reply, which reopens it."}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-primary-950 hover:bg-surface-muted"
          >
            {closed ? "Reopen" : "Close"}
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-surface-muted p-4 sm:p-5">
        <Conversation messages={thread.messages} viewer="admin" patronName={patronName} />
      </div>

      <section className="mt-6 bg-white rounded-lg border border-line p-5">
        <h2 className="font-display font-bold text-base text-primary-950 mb-3">Reply on behalf of the executive</h2>
        <ThreadReplyForm
          action={adminReplyToThreadAction.bind(null, thread.id)}
          note="The patron is emailed your reply and sees it in their portal."
        />
      </section>
    </div>
  );
}
