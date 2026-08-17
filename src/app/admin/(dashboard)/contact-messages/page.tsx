import { Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/Common";
import { listContactMessages } from "@/lib/services/contact-service";
import { ContactMessageRow } from "@/components/admin/ContactMessageRow";

export const metadata = { title: "Contact Messages" };
export const dynamic = "force-dynamic";

export default async function ContactMessagesPage() {
  const messages = await listContactMessages();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-primary-950">Contact Messages</h1>
        <p className="text-sm text-slate mt-1">{messages.length} message{messages.length === 1 ? "" : "s"}</p>
      </div>

      {messages.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title="No messages yet" description="Submissions from the public contact form will appear here." />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <ContactMessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
