"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/auth/admin";
import { AdminRole, ContentStatus } from "@/generated/prisma/client";
import { newsSchema } from "@/lib/validations/content";
import { createNews, updateNews, deleteNews, setNewsStatus } from "@/lib/services/news-service";
import { extractObjectKeyFromPublicUrl, deleteObject } from "@/lib/storage/r2";
import type { ActionState } from "./types";

function parseNewsForm(formData: FormData) {
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return newsSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    coverImageKey: formData.get("coverImageKey") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    tags,
    status: formData.get("status") ?? ContentStatus.DRAFT,
    featured: formData.get("featured") === "on",
  });
}

async function createNewsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminRole(AdminRole.EDITOR);
  const parsed = parseNewsForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const coverImageUrl = formData.get("coverImageUrl");
  const article = await createNews(
    parsed.data,
    typeof coverImageUrl === "string" && coverImageUrl ? coverImageUrl : null,
    admin.id,
  );

  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
  redirect(`/admin/news/${article.id}`);
}

async function updateNewsActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminRole(AdminRole.EDITOR);
  const parsed = parseNewsForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = parsed.data.id;
  if (!id) return { error: "Missing article id." };

  const coverImageUrlRaw = formData.get("coverImageUrl");
  const coverImageUrl = typeof coverImageUrlRaw === "string" ? coverImageUrlRaw : undefined;

  const updated = await updateNews(id, parsed.data, coverImageUrl || null);

  revalidatePath("/news");
  revalidatePath(`/news/${updated.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/news");
  return {};
}

async function deleteNewsActionImpl(id: string): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  const article = await deleteNews(id);
  const key = extractObjectKeyFromPublicUrl(article.coverImageUrl);
  if (key) {
    try {
      await deleteObject(key);
    } catch (err) {
      console.error("[news] failed to delete R2 cover image:", err);
    }
  }
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
}

async function setNewsStatusActionImpl(id: string, status: ContentStatus): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  await setNewsStatus(id, status);
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const createNewsAction = withActionErrorHandling("createNewsAction", createNewsActionImpl);
export const updateNewsAction = withActionErrorHandling("updateNewsAction", updateNewsActionImpl);
export const deleteNewsAction = withVoidActionErrorHandling("deleteNewsAction", deleteNewsActionImpl);
export const setNewsStatusAction = withVoidActionErrorHandling("setNewsStatusAction", setNewsStatusActionImpl);
