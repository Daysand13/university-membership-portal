"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import { contactMessageSchema } from "@/lib/validations/content";
import { submitContactMessage, markMessageRead, archiveMessage } from "@/lib/services/contact-service";
import type { ActionState } from "./types";

export async function submitContactMessageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await submitContactMessage(parsed.data);
  return { success: true };
}

export async function markMessageReadAction(id: string): Promise<void> {
  await requireAdminUser();
  await markMessageRead(id);
  revalidatePath("/admin/contact-messages");
}

export async function archiveMessageAction(id: string): Promise<void> {
  await requireAdminUser();
  await archiveMessage(id);
  revalidatePath("/admin/contact-messages");
}
