"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireAlumni } from "@/lib/auth/alumni";
import { requireCapability } from "@/lib/auth/admin";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { cvSchema } from "@/lib/validations/cv";
import { saveCv, type CvOwner } from "@/lib/services/cv-service";
import {
  recordCashDocumentPayment,
  startDocumentPurchase,
  type PurchaseOwner,
} from "@/lib/services/document-purchase-service";
import type { ActionState } from "./types";

/**
 * Writing a CV, and paying for it — from either portal.
 *
 * The form sends its repeating sections as one JSON field (see
 * components/portal/CvForm), so parsing is a single schema check rather
 * than a walk through numbered form inputs.
 */

/** Which portal this request came from decides whose CV is being touched. */
async function ownerFor(portal: "member" | "alumni"): Promise<{ cv: CvOwner; purchase: PurchaseOwner; path: string }> {
  if (portal === "alumni") {
    const alumnus = await requireAlumni();
    return {
      cv: { kind: "alumni", id: alumnus.id },
      purchase: { kind: "alumni", id: alumnus.id, email: alumnus.email },
      path: "/alumni/cv",
    };
  }
  const member = await requireMember();
  return {
    cv: { kind: "member", id: member.id },
    purchase: { kind: "member", id: member.id, email: member.email },
    path: "/membership/dashboard/cv",
  };
}

async function saveCvActionImpl(
  portal: "member" | "alumni",
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const owner = await ownerFor(portal);

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

  await saveCv(owner.cv, parsed.data);
  revalidatePath(owner.path);
  return { success: true, message: "Saved. Your CV is up to date." };
}

async function payForCvActionImpl(portal: "member" | "alumni"): Promise<void> {
  const owner = await ownerFor(portal);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const result = await startDocumentPurchase({
    owner: owner.purchase,
    kind: PaidDocumentKind.CV,
    callbackUrl: `${base}${owner.path}/paid`,
  });

  if (!result.ok) {
    // Carried back on the address so the page can say what happened —
    // there is nowhere else to put it on a redirect.
    redirect(`${owner.path}?payment=${encodeURIComponent(result.error)}`);
  }
  redirect(result.authorizationUrl);
}

async function recordCashCvPaymentActionImpl(memberId: string): Promise<void> {
  const admin = await requireCapability("finance.dues");
  const result = await recordCashDocumentPayment({
    owner: { kind: "member", id: memberId, email: "" },
    kind: PaidDocumentKind.CV,
    admin,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/admin/members/${memberId}`);
}

async function recordCashAlumniCvPaymentActionImpl(alumniId: string): Promise<void> {
  const admin = await requireCapability("finance.dues");
  const result = await recordCashDocumentPayment({
    owner: { kind: "alumni", id: alumniId, email: "" },
    kind: PaidDocumentKind.CV,
    admin,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/admin/alumni/${alumniId}`);
}

export const saveCvAction = withActionErrorHandling("saveCvAction", saveCvActionImpl);
export const payForCvAction = withVoidActionErrorHandling("payForCvAction", payForCvActionImpl);
export const recordCashCvPaymentAction = withVoidActionErrorHandling(
  "recordCashCvPaymentAction",
  recordCashCvPaymentActionImpl,
);
export const recordCashAlumniCvPaymentAction = withVoidActionErrorHandling(
  "recordCashAlumniCvPaymentAction",
  recordCashAlumniCvPaymentActionImpl,
);
