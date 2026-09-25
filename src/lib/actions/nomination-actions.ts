"use server";

import { withActionErrorHandling, withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireCapability } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { recordCashDocumentPayment, startDocumentPurchase } from "@/lib/services/document-purchase-service";
import type { ActionState } from "./types";

/**
 * Buying the form to stand for a post.
 *
 * Dues come first — standing for office is a paid-up member's right, and
 * checking it here means nobody pays for a form they were never eligible
 * to use.
 */

const NOMINATIONS_PATH = "/membership/dashboard/elections";

async function buyNominationFormActionImpl(positionId: string): Promise<void> {
  const member = await requireMember();

  if (!(await hasPaidDuesForYear(member.id, getCurrentAcademicYear()))) {
    redirect(`${NOMINATIONS_PATH}?nomination=${encodeURIComponent("Your dues for this year need to be paid first.")}`);
  }

  const position = await db.electionPosition.findUnique({ where: { id: positionId } });
  if (!position) redirect(`${NOMINATIONS_PATH}?nomination=${encodeURIComponent("That post is no longer on the ballot.")}`);

  const result = await startDocumentPurchase({
    owner: { kind: "member", id: member.id, email: member.email },
    kind: PaidDocumentKind.NOMINATION_FORM,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${NOMINATIONS_PATH}/form-paid`,
    position: {
      id: position.id,
      title: position.title,
      nominationFeePesewas: position.nominationFeePesewas,
    },
  });

  if (!result.ok) redirect(`${NOMINATIONS_PATH}?nomination=${encodeURIComponent(result.error)}`);
  redirect(result.authorizationUrl);
}

/**
 * An officer taking the fee at the desk, as they can for dues and a CV.
 *
 * Found by index number, because that is what the member will say at the
 * counter — nobody knows their own record's id.
 */
async function recordCashNominationFormActionImpl(
  positionId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireCapability("elections.nominations");
  const indexNumber = String(formData.get("indexNumber") ?? "").trim().toUpperCase();
  if (!indexNumber) return { fieldErrors: { indexNumber: ["Which member paid?"] } };

  const [position, member] = await Promise.all([
    db.electionPosition.findUniqueOrThrow({ where: { id: positionId } }),
    db.member.findUnique({ where: { indexNumber }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!member) return { fieldErrors: { indexNumber: ["No member has that index number"] } };

  if (!(await hasPaidDuesForYear(member.id, getCurrentAcademicYear()))) {
    return { error: `${member.firstName} hasn't paid dues this year, so they can't stand for office yet.` };
  }

  const result = await recordCashDocumentPayment({
    owner: { kind: "member", id: member.id, email: "" },
    kind: PaidDocumentKind.NOMINATION_FORM,
    admin,
    position: {
      id: position.id,
      title: position.title,
      nominationFeePesewas: position.nominationFeePesewas,
    },
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/elections/${position.electionId}`);
  return {
    success: true,
    message: `${member.firstName} ${member.lastName} can now put their name forward for ${position.title}.`,
  };
}

export const buyNominationFormAction = withVoidActionErrorHandling(
  "buyNominationFormAction",
  buyNominationFormActionImpl,
);
export const recordCashNominationFormAction = withActionErrorHandling(
  "recordCashNominationFormAction",
  recordCashNominationFormActionImpl,
);
