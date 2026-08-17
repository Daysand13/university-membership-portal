"use client";

import { useTransition } from "react";
import { Loader2, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { setEventStatusAction, deleteEventAction } from "@/lib/actions/event-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ContentStatus } from "@/generated/prisma/enums";

export function EventRowActions({ id, status }: { id: string; status: ContentStatus }) {
  const [isPending, startTransition] = useTransition();
  const isPublished = status === ContentStatus.PUBLISHED;

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title={isPublished ? "Unpublish" : "Publish"}
        disabled={isPending}
        onClick={() =>
          startTransition(() => setEventStatusAction(id, isPublished ? ContentStatus.DRAFT : ContentStatus.PUBLISHED))
        }
        className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <Link href={`/admin/events/${id}`} title="Edit" className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
        <Pencil size={15} />
      </Link>
      <ConfirmButton
        action={() => deleteEventAction(id)}
        confirmMessage="Delete this event permanently? This can't be undone."
        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
      >
        <Trash2 size={15} />
      </ConfirmButton>
    </div>
  );
}
