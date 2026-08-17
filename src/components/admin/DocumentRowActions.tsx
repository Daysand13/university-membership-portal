"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteDocumentAction } from "@/lib/actions/document-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function DocumentRowActions({ id }: { id: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/library/${id}`} title="Edit" className="p-2 rounded-md text-slate hover:bg-surface-muted hover:text-primary-800">
        <Pencil size={15} />
      </Link>
      <ConfirmButton
        action={() => deleteDocumentAction(id)}
        confirmMessage="Delete this document permanently? This can't be undone."
        className="p-2 rounded-md text-slate hover:bg-danger-light hover:text-danger"
      >
        <Trash2 size={15} />
      </ConfirmButton>
    </div>
  );
}
