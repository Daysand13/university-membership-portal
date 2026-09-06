"use server";

import { withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/admin";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/services/notification-service";

async function markNotificationReadActionImpl(id: string): Promise<void> {
  await requireAdminUser();
  await markNotificationRead(id);
  revalidatePath("/admin", "layout");
}

async function markAllNotificationsReadActionImpl(): Promise<void> {
  await requireAdminUser();
  await markAllNotificationsRead();
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Exported actions, each wrapped so an unexpected failure surfaces as a
// friendly message instead of a raw server-error page. See
// ./with-error-handling.ts for why this is done at the boundary.
// ---------------------------------------------------------------------------

export const markNotificationReadAction = withVoidActionErrorHandling("markNotificationReadAction", markNotificationReadActionImpl);
export const markAllNotificationsReadAction = withVoidActionErrorHandling("markAllNotificationsReadAction", markAllNotificationsReadActionImpl);
