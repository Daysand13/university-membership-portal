"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteHeroSlideAction, setHeroSlideActiveAction } from "@/lib/actions/content-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function HeroSlideRowActions({ id, title, isActive }: { id: string; title: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title={isActive ? "Hide from the homepage" : "Show on the homepage"}
        disabled={isPending}
        onClick={() => startTransition(() => setHeroSlideActiveAction(id, !isActive))}
        className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800"
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : isActive ? (
          <EyeOff size={15} aria-hidden="true" />
        ) : (
          <Eye size={15} aria-hidden="true" />
        )}
        <span className="sr-only">{isActive ? `Hide ${title}` : `Show ${title}`}</span>
      </button>
      <Link href={`/admin/hero-slides/${id}`} title="Edit" className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
        <Pencil size={15} aria-hidden="true" />
        <span className="sr-only">Edit {title}</span>
      </Link>
      <ConfirmButton
        action={() => deleteHeroSlideAction(id)}
        confirmMessage={`Remove the "${title}" slide? This can't be undone.`}
        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
      >
        <Trash2 size={15} aria-hidden="true" />
        <span className="sr-only">Delete {title}</span>
      </ConfirmButton>
    </div>
  );
}
