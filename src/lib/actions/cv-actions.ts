"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireCapability } from "@/lib/auth/admin";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { cvSchema } from "@/lib/validations/cv";
import { saveCv } from "@/lib/services/cv-service";
import { recordCashDocumentPayment, startDocumentPurchase } from "@/lib/services/document-purchase-service";
import type { ActionState } from "./types";

/**
 * A member writing their CV, and paying for it.
 *
 * The form sends its repeating sections as one JSON field — see
 * components/portal/CvForm — so the parsing is a single schema check
 * rather than a walk through numbered form inputs.
 */

async function saveCvActionImpl(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const member = await requireMember();

  const sectionsRaw = formData.get("sections");
  let sections: unknown = {};
  try {
    sections = JSON.parse(typeof sectionsRaw === "string" ? sectionsRaw : "{}");
  } catch {
    return { error: "Your CV couldn't be read back. Please try saving it again." };
  }

  const parsed = cvSchema.safeParse(sections);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    // Row-level problems come back keyed by array index, which means
    // nothing on screen — the first readable message is more use than a
    // field name nobody can find.
    const first = parsed.error.issues[0];
    return {
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
      error: first ? first.message : "Some of your CV couldn't be saved. Check the entries and try again.",
    };
  }

  await saveCv(member.id, parsed.data);
  revalidatePath("/membership/dashboard/cv");
  return { success: true, message: "Saved. Your CV is up to date." };
}

async function payForCvActionImpl(): Promise<void> {
  const member = await requireMember();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const result = await startDocumentPurchase({
    member,
    kind: PaidDocumentKind.CV,
    callbackUrl: `${base}/membership/dashboard/cv/paid`,
  });

  if (!result.ok) {
    // Carried back on the address so the page can say what happened —
    // there is nowhere else to put it on a redirect.
    redirect(`/membership/dashboard/cv?payment=${encodeURIComponent(result.error)}`);
  }
  redirect(result.authorizationUrl);
}

async function recordCashCvPaymentActionImpl(memberId: string): Promise<void> {
  const admin = await requireCapability("finance.dues");
  const result = await recordCashDocumentPayment({ memberId, kind: PaidDocumentKind.CV, admin });
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/admin/members/${memberId}`);
}

export const saveCvAction = withActionErrorHandling("saveCvAction", saveCvActionImpl);
export const payForCvAction = withVoidActionErrorHandling("payForCvAction", payForCvActionImpl);
export const recordCashCvPaymentAction = withVoidActionErrorHandling(
  "recordCashCvPaymentAction",
  recordCashCvPaymentActionImpl,
);
