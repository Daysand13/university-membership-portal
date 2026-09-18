"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormAlert, Label, inputClasses } from "@/components/ui/Common";
import type { ActionState } from "@/lib/actions/types";

const timeFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const dateTimeLocalFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export interface ThreadMessage {
  id: string;
  sender: "STUDENT" | "MENTOR";
  body: string;
  createdAt: Date;
}

/**
 * A mentorship conversation. The same component in both portals — `viewer`
 * decides which side is "you" — because a student and their mentor should
 * be reading the same thing, not two different renderings of it.
 */
export function MentorshipThread({
  messages,
  viewer,
  otherName,
}: {
  messages: ThreadMessage[];
  viewer: "student" | "mentor";
  otherName: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="text-slate text-[15px]">
        No messages yet. Say hello — {otherName} will get an email that you&apos;ve written.
      </p>
    );
  }

  return (
    <ol className="space-y-4" aria-label="Messages">
      {messages.map((message) => {
        const mine = (message.sender === "STUDENT") === (viewer === "student");
        return (
          <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                mine ? "bg-primary-800 text-white rounded-br-md" : "bg-white border border-line text-ink rounded-bl-md"
              }`}
            >
              <p className={`text-xs font-semibold mb-1 ${mine ? "text-primary-100" : "text-slate"}`}>
                {mine ? "You" : otherName} · {timeFormat.format(message.createdAt)}
              </p>
              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{message.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The reply box under a conversation. The action differs per portal. */
export function MessageComposer({
  action,
  disabled,
  disabledReason,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});

  if (disabled) {
    return <p className="text-sm text-slate">{disabledReason ?? "This conversation is closed."}</p>;
  }

  return (
    <form action={formAction} className="space-y-3" key={resetKey}>
      <FormAlert message={state.error} />
      <div>
        <Label htmlFor="mentorship-message">Your message</Label>
        <textarea
          id="mentorship-message"
          name="body"
          rows={3}
          required
          maxLength={5000}
          className={inputClasses}
          placeholder="Write a message…"
        />
        <FieldError messages={state.fieldErrors?.body} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
        {isPending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}

/** Booking a session. Shared for the same reason as the thread itself. */
export function SessionBookingForm({
  action,
  label = "Book a session",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) setResetKey((k) => k + 1);
    return result;
  }, {});

  return (
    <form action={formAction} className="space-y-3" key={resetKey}>
      {state.success ? <FormAlert variant="success" message="Session booked. The other side has been told." /> : <FormAlert message={state.error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="session-when" required>
            When
          </Label>
          <input id="session-when" name="scheduledFor" type="datetime-local" required className={inputClasses} />
          <FieldError messages={state.fieldErrors?.scheduledFor} />
        </div>
        <div>
          <Label htmlFor="session-topic">What it&apos;s about</Label>
          <input
            id="session-topic"
            name="topic"
            maxLength={200}
            className={inputClasses}
            placeholder="e.g. Choosing a final-year project"
          />
          <FieldError messages={state.fieldErrors?.topic} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
        {isPending ? "Booking…" : label}
      </Button>
    </form>
  );
}

export function formatSessionTime(date: Date): string {
  return dateTimeLocalFormat.format(date);
}
