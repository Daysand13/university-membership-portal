"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createDocumentAction, updateDocumentAction } from "@/lib/actions/document-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { DocumentUploadField } from "@/components/admin/DocumentUploadField";
import type { Document, DocumentCategory } from "@/generated/prisma/client";

export function DocumentForm({ document, categories }: { document?: Document; categories: DocumentCategory[] }) {
  const action = document ? updateDocumentAction : createDocumentAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert message={state.error} />
      {document && <input type="hidden" name="id" value={document.id} />}

      {!document && <DocumentUploadField />}

      <div>
        <Label htmlFor="title" required>Title</Label>
        <input id="title" name="title" required defaultValue={document?.title} className={inputClasses} />
        <FieldError messages={fe.title} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" rows={3} defaultValue={document?.description ?? ""} className={inputClasses} />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" defaultValue={document?.categoryId ?? ""} className={inputClasses}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="version">Version (optional)</Label>
          <input id="version" name="version" defaultValue={document?.version ?? ""} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={document?.status ?? "DRAFT"} className={inputClasses}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-6 pt-6">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" name="featured" defaultChecked={document?.featured} className="h-4 w-4 rounded border-line text-primary-800" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" name="isPublic" defaultChecked={document?.isPublic ?? true} className="h-4 w-4 rounded border-line text-primary-800" />
            Publicly downloadable
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : document ? "Save Changes" : "Add to Library"}
      </Button>
    </form>
  );
}
