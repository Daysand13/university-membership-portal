const timeFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export interface ConversationMessage {
  id: string;
  sender: "PATRON" | "ADMIN";
  body: string;
  createdAt: Date;
  admin: { name: string } | null;
}

/**
 * The messages in an executive-channel conversation, oldest first. `viewer`
 * decides which side is "you": the patron's messages sit on the right in the
 * Patrons' Portal, the team's on the right in the admin area.
 */
export function Conversation({
  messages,
  viewer,
  patronName,
}: {
  messages: ConversationMessage[];
  viewer: "patron" | "admin";
  patronName: string;
}) {
  return (
    <ol className="space-y-4" aria-label="Messages">
      {messages.map((message) => {
        const mine = (message.sender === "PATRON") === (viewer === "patron");
        const author =
          message.sender === "PATRON"
            ? viewer === "patron"
              ? "You"
              : patronName
            : viewer === "admin"
              ? `${message.admin?.name ?? "Administrator"} (team)`
              : "Executive team";
        return (
          <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                mine ? "bg-primary-800 text-white rounded-br-md" : "bg-white border border-line text-ink rounded-bl-md"
              }`}
            >
              <p className={`text-xs font-semibold mb-1 ${mine ? "text-primary-100" : "text-slate"}`}>
                {author} · {timeFormat.format(message.createdAt)}
              </p>
              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{message.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
