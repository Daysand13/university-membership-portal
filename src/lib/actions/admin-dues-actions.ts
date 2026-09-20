"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole, requireCapability } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { recordCashDuesPayment, removeCashDuesPayment } from "@/lib/services/dues-service";
import { withTypedActionErrorHandling } from "./with-error-handling";

/**
 * Admin > Dues: record a member's dues as paid in cash, or take back a cash
 * payment recorded by mistake. A refusal (already paid, already removed)
 * throws so ConfirmButton shows that it didn't work; the page is revalidated
 * first, so it re-renders showing the real state either way.
 */

function revalidateDues(memberId?: string) {
  revalidatePath("/admin/dues");
  revalidatePath("/membership/dashboard");
  revalidatePath("/membership/dashboard/dues");
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

async function recordCashDuesPaymentActionImpl(memberId: string): Promise<string> {
  const admin = await requireCapability("finance.dues.record");
  const result = await recordCashDuesPayment({ memberId, adminId: admin.id });
  revalidateDues(memberId);
  if (!result.ok) throw new Error(result.error);
  return result.summary;
}

async function removeCashDuesPaymentActionImpl(paymentId: string): Promise<string> {
  const admin = await requireCapability("finance.dues.record");
  const result = await removeCashDuesPayment({ paymentId, adminId: admin.id });
  revalidateDues();
  if (!result.ok) throw new Error(result.error);
  return result.summary;
}

export const recordCashDuesPaymentAction = withTypedActionErrorHandling(
  "recordCashDuesPaymentAction",
  recordCashDuesPaymentActionImpl,
);
export const removeCashDuesPaymentAction = withTypedActionErrorHandling(
  "removeCashDuesPaymentAction",
  removeCashDuesPaymentActionImpl,
);
