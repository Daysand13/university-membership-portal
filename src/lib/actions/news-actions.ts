"use server";

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

export async function createNewsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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

export async function updateNewsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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

export async function deleteNewsAction(id: string): Promise<void> {
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

export async function setNewsStatusAction(id: string, status: ContentStatus): Promise<void> {
  await requireAdminRole(AdminRole.EDITOR);
  await setNewsStatus(id, status);
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/admin/news");
}
