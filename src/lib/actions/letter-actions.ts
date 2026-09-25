"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireCapability } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { letterSchema } from "@/lib/validations/letter";
import { createLetter, deleteLetter, updateLetter } from "@/lib/services/letter-service";
import { recordCashDocumentPayment, startDocumentPurchase } from "@/lib/services/document-purchase-service";
import type { ActionState } from "./types";

/**
 * Writing a letter, and paying for the laid-out copy.
 *
 * Charged one letter at a time: somebody who needs a single letter should
 * not be asked to buy a subscription to write it. Writing and correcting
 * are free — it is the finished document that costs.
 */

const LETTERS_PATH = "/membership/dashboard/letters";

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
  letterId: string | null,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const member = await requireMember();
  const owner = { kind: "member" as const, id: member.id };

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
    revalidatePath(`${LETTERS_PATH}/${letterId}`);
    revalidatePath(LETTERS_PATH);
    return { success: true, message: "Saved. The letter is up to date." };
  }

  const created = await createLetter(owner, parsed.data);
  revalidatePath(LETTERS_PATH);
  redirect(`${LETTERS_PATH}/${created.id}?saved=1`);
}

async function payForLetterActionImpl(letterId: string): Promise<void> {
  const member = await requireMember();
  const letter = await db.memberLetter.findFirst({
    where: { id: letterId, memberId: member.id },
    select: { id: true },
  });
  if (!letter) redirect(`${LETTERS_PATH}?letter=${encodeURIComponent("That letter is not yours.")}`);

  const result = await startDocumentPurchase({
    owner: { kind: "member", id: member.id, email: member.email },
    kind: PaidDocumentKind.LETTER,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${LETTERS_PATH}/${letterId}/paid`,
    letterId,
  });

  if (!result.ok) redirect(`${LETTERS_PATH}/${letterId}?payment=${encodeURIComponent(result.error)}`);
  redirect(result.authorizationUrl);
}

async function deleteLetterActionImpl(letterId: string): Promise<void> {
  const member = await requireMember();
  const result = await deleteLetter({ kind: "member", id: member.id }, letterId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(LETTERS_PATH);
  redirect(LETTERS_PATH);
}

/** An officer taking the ten cedis at the desk, as for a CV. */
async function recordCashLetterPaymentActionImpl(letterId: string, memberId: string): Promise<void> {
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

export const saveLetterAction = withActionErrorHandling("saveLetterAction", saveLetterActionImpl);
export const payForLetterAction = withVoidActionErrorHandling("payForLetterAction", payForLetterActionImpl);
export const deleteLetterAction = withVoidActionErrorHandling("deleteLetterAction", deleteLetterActionImpl);
export const recordCashLetterPaymentAction = withVoidActionErrorHandling(
  "recordCashLetterPaymentAction",
  recordCashLetterPaymentActionImpl,
);
