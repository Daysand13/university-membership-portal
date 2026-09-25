"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireAlumni } from "@/lib/auth/alumni";
import { requireCapability } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { letterSchema } from "@/lib/validations/letter";
import { createLetter, deleteLetter, updateLetter } from "@/lib/services/letter-service";
import {
  recordCashDocumentPayment,
  startDocumentPurchase,
  type PurchaseOwner,
} from "@/lib/services/document-purchase-service";
import type { CvOwner } from "@/lib/services/cv-service";
import type { ActionState } from "./types";

/**
 * Writing a letter, and paying for the laid-out copy.
 *
 * Charged one letter at a time: somebody who needs a single letter should
 * not be asked to buy a subscription to write it. Writing and correcting
 * are free — it is the finished document that costs.
 */

export type LetterPortal = "member" | "alumni";

/** Which portal the request came from decides whose letters these are. */
async function ownerFor(
  portal: LetterPortal,
): Promise<{ letter: CvOwner; purchase: PurchaseOwner; path: string }> {
  if (portal === "alumni") {
    const alumnus = await requireAlumni();
    return {
      letter: { kind: "alumni", id: alumnus.id },
      purchase: { kind: "alumni", id: alumnus.id, email: alumnus.email },
      path: "/alumni/letters",
    };
  }
  const member = await requireMember();
  return {
    letter: { kind: "member", id: member.id },
    purchase: { kind: "member", id: member.id, email: member.email },
    path: "/membership/dashboard/letters",
  };
}

function parse(formData: FormData) {
  const value = (key: string) => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw : "";
  };
  return letterSchema.safeParse({
    title: value("title"),
    senderName: value("senderName"),
    senderAddress: value("senderAddress"),
    senderPhone: value("senderPhone"),
    senderEmail: value("senderEmail"),
    letterDate: value("letterDate"),
    recipientName: value("recipientName"),
    recipientTitle: value("recipientTitle"),
    recipientOrganisation: value("recipientOrganisation"),
    recipientAddress: value("recipientAddress"),
    salutation: value("salutation"),
    subject: value("subject"),
    body: value("body"),
    closing: value("closing"),
    signatureKind: value("signatureKind") || undefined,
    signatureData: value("signatureData"),
  });
}

async function saveLetterActionImpl(
  portal: LetterPortal,
  letterId: string | null,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { letter: owner, path } = await ownerFor(portal);

  const parsed = parse(formData);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: first ? first.message : "Some of the letter couldn't be saved.",
    };
  }

  if (letterId) {
    const updated = await updateLetter(owner, letterId, parsed.data);
    if (!updated) return { error: "That letter is not yours, or no longer exists." };
    revalidatePath(`${path}/${letterId}`);
    revalidatePath(path);
    return { success: true, message: "Saved. The letter is up to date." };
  }

  const created = await createLetter(owner, parsed.data);
  revalidatePath(path);
  redirect(`${path}/${created.id}?saved=1`);
}

async function payForLetterActionImpl(portal: LetterPortal, letterId: string): Promise<void> {
  const { letter: owner, purchase, path } = await ownerFor(portal);
  const letter = await db.memberLetter.findFirst({
    where: {
      id: letterId,
      ...(owner.kind === "member" ? { memberId: owner.id } : { alumniProfileId: owner.id }),
    },
    select: { id: true },
  });
  if (!letter) redirect(`${path}?letter=${encodeURIComponent("That letter is not yours.")}`);

  const result = await startDocumentPurchase({
    owner: purchase,
    kind: PaidDocumentKind.LETTER,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${path}/${letterId}/paid`,
    letterId,
  });

  if (!result.ok) redirect(`${path}/${letterId}?payment=${encodeURIComponent(result.error)}`);
  redirect(result.authorizationUrl);
}

async function deleteLetterActionImpl(portal: LetterPortal, letterId: string): Promise<void> {
  const { letter: owner, path } = await ownerFor(portal);
  const result = await deleteLetter(owner, letterId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(path);
  redirect(path);
}

/**
 * An officer taking the ten cedis at the desk, as for a CV.
 *
 * This is the path that actually gets used: most people here pay over the
 * counter, and it is the only way to pay at all while the online account
 * is still being set up.
 */
async function recordCashLetterPaymentActionImpl(memberId: string, letterId: string): Promise<void> {
  const admin = await requireCapability("finance.dues");
  const result = await recordCashDocumentPayment({
    owner: { kind: "member", id: memberId, email: "" },
    kind: PaidDocumentKind.LETTER,
    admin,
    letterId,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/admin/members/${memberId}`);
}

async function recordCashAlumniLetterPaymentActionImpl(alumniId: string, letterId: string): Promise<void> {
  const admin = await requireCapability("finance.dues");
  const result = await recordCashDocumentPayment({
    owner: { kind: "alumni", id: alumniId, email: "" },
    kind: PaidDocumentKind.LETTER,
    admin,
    letterId,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/admin/alumni/${alumniId}`);
}

export const saveLetterAction = withActionErrorHandling("saveLetterAction", saveLetterActionImpl);
export const payForLetterAction = withVoidActionErrorHandling("payForLetterAction", payForLetterActionImpl);
export const deleteLetterAction = withVoidActionErrorHandling("deleteLetterAction", deleteLetterActionImpl);
export const recordCashLetterPaymentAction = withVoidActionErrorHandling(
  "recordCashLetterPaymentAction",
  recordCashLetterPaymentActionImpl,
);
export const recordCashAlumniLetterPaymentAction = withVoidActionErrorHandling(
  "recordCashAlumniLetterPaymentAction",
  recordCashAlumniLetterPaymentActionImpl,
);
