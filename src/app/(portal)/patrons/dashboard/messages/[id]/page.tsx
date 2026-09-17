import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePatron } from "@/lib/auth/patron";
import { openThreadForPatron } from "@/lib/services/patron-message-service";
import { replyToThreadAction } from "@/lib/actions/patron-portal-actions";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Conversation } from "@/components/patron-portal/Conversation";
import { ThreadReplyForm } from "@/components/patron-portal/MessageForms";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function PatronThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const patron = await requirePatron();
  const { id } = await params;
  const thread = await openThreadForPatron(patron.id, id);
  if (!thread) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href="/patrons/dashboard/messages?tab=executive"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-accent-600"
      >
        <ArrowLeft size={15} aria-hidden="true" /> All conversations
      </Link>
      <PortalPageHeader
        title={thread.subject}
        description={
          <>
            To {thread.addressedTo}
            {thread.status === "CLOSED" && (
              <>
                {" "}
                · <StatusBadge status="CLOSED" />
              </>
            )}
          </>
        }
      />

      <Conversation messages={thread.messages} viewer="patron" patronName="You" />

      <section aria-labelledby="reply-heading" className="bg-white rounded-xl border border-line shadow-card p-5">
        <h2 id="reply-heading" className="font-display font-bold text-lg text-primary-950 mb-3">
          Reply
        </h2>
        <ThreadReplyForm
          action={replyToThreadAction.bind(null, thread.id)}
          note={thread.status === "CLOSED" ? "Replying reopens this conversation." : undefined}
        />
      </section>
    </div>
  );
}
