"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createNewsAction, updateNewsAction } from "@/lib/actions/news-actions";
import { initialActionState } from "@/lib/actions/types";
import { Label, inputClasses, FieldError, FormAlert } from "@/components/ui/Common";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { News, NewsCategory } from "@/generated/prisma/client";

export function NewsForm({
  article,
  categories,
}: {
  article?: News;
  categories: NewsCategory[];
}) {
  const action = article ? updateNewsAction : createNewsAction;
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert message={state.error} />
      {article && <input type="hidden" name="id" value={article.id} />}

      <div className="bg-white rounded-lg border border-line p-6 space-y-5">
        <div>
          <Label htmlFor="title" required>Title</Label>
          <input id="title" name="title" required defaultValue={article?.title} className={inputClasses} />
          <FieldError messages={fe.title} />
        </div>
        <div>
          <Label htmlFor="slug">URL Slug</Label>
          <input
            id="slug"
            name="slug"
            placeholder="Leave blank to generate automatically from the title"
            defaultValue={article?.slug}
            className={`${inputClasses} font-data`}
          />
        </div>
        <div>
          <Label htmlFor="excerpt" required>Short Summary / Excerpt</Label>
          <textarea id="excerpt" name="excerpt" required rows={2} defaultValue={article?.excerpt} className={inputClasses} />
          <FieldError messages={fe.excerpt} />
        </div>
        <ImageUploadField name="coverImageUrl" category="NEWS" label="Cover Image" defaultUrl={article?.coverImageUrl} />
        <div>
          <Label htmlFor="body" required>Article Body</Label>
          <RichTextEditor name="body" defaultValue={article?.body} />
          <FieldError messages={fe.body} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-line p-6 grid sm:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" defaultValue={article?.categoryId ?? ""} className={inputClasses}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <input id="tags" name="tags" defaultValue={article?.tags.join(", ")} className={inputClasses} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={article?.status ?? "DRAFT"} className={inputClasses}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
            <input type="checkbox" name="featured" defaultChecked={article?.featured} className="h-4 w-4 rounded border-line text-primary-800" />
            Feature this article
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isPending ? "Saving…" : article ? "Save Changes" : "Create Article"}
      </Button>
    </form>
  );
}
