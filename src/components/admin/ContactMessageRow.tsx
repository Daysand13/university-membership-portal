"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Mail, Phone, Archive, Loader2 } from "lucide-react";
import { markMessageReadAction, archiveMessageAction } from "@/lib/actions/contact-actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ContactMessage } from "@/generated/prisma/client";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    date,
  );
}

export function ContactMessageRow({ message }: { message: ContactMessage }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`bg-white rounded-lg border ${message.status === "NEW" ? "border-primary-200" : "border-line"}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (message.status === "NEW") startTransition(() => markMessageReadAction(message.id));
        }}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <p className="font-medium text-primary-950 truncate">{message.subject}</p>
            <StatusBadge status={message.status} />
          </div>
          <p className="text-xs text-slate-light mt-1">
            {message.name} · {message.email} · {formatDate(message.createdAt)}
          </p>
        </div>
        <ChevronDown size={18} className={`text-slate shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-line pt-4">
          <p className="text-sm text-ink whitespace-pre-line">{message.message}</p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <a href={`mailto:${message.email}`} className="flex items-center gap-1.5 text-primary-800 font-semibold hover:text-accent-600">
              <Mail size={14} /> Reply by Email
            </a>
            {message.phone && (
              <a href={`tel:${message.phone}`} className="flex items-center gap-1.5 text-primary-800 font-semibold hover:text-accent-600">
                <Phone size={14} /> {message.phone}
              </a>
            )}
            {message.status !== "ARCHIVED" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => archiveMessageAction(message.id))}
                className="flex items-center gap-1.5 text-slate font-semibold hover:text-danger ml-auto"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} Archive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
