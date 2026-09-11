"use client";

import { useTransition } from "react";
import { Loader2, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { setTeamMemberActiveAction, deleteTeamMemberAction } from "@/lib/actions/content-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function TeamRowActions({ id, isActive, name }: { id: string; isActive: boolean; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title={isActive ? "Deactivate" : "Activate"}
        disabled={isPending}
        onClick={() => startTransition(() => setTeamMemberActiveAction(id, !isActive))}
        className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : isActive ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <Link href={`/admin/team/${id}`} title="Edit" className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
        <Pencil size={15} />
      </Link>
      <ConfirmButton
        action={() => deleteTeamMemberAction(id)}
        confirmMessage={`Remove ${name}?`}
        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
      >
        <Trash2 size={15} />
      </ConfirmButton>
    </div>
  );
}
