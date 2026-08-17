"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/services/notification-service";

export async function markNotificationReadAction(id: string): Promise<void> {
  await requireAdminUser();
  await markNotificationRead(id);
  revalidatePath("/admin", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await requireAdminUser();
  await markAllNotificationsRead();
  revalidatePath("/admin", "layout");
}
