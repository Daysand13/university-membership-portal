"use server";

import { withVoidActionErrorHandling } from "./with-error-handling";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { requireCapability } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { recordCashDocumentPayment, startDocumentPurchase } from "@/lib/services/document-purchase-service";

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

/** An officer taking the fee at the desk, as they can for dues and a CV. */
async function recordCashNominationFormActionImpl(memberId: string, positionId: string): Promise<void> {
  const admin = await requireCapability("elections.nominations");
  const position = await db.electionPosition.findUniqueOrThrow({ where: { id: positionId } });

  const result = await recordCashDocumentPayment({
    owner: { kind: "member", id: memberId, email: "" },
    kind: PaidDocumentKind.NOMINATION_FORM,
    admin,
    position: {
      id: position.id,
      title: position.title,
      nominationFeePesewas: position.nominationFeePesewas,
    },
  });
  if (!result.ok) throw new Error(result.error);

  revalidatePath(`/admin/elections/${position.electionId}`);
}

export const buyNominationFormAction = withVoidActionErrorHandling(
  "buyNominationFormAction",
  buyNominationFormActionImpl,
);
export const recordCashNominationFormAction = withVoidActionErrorHandling(
  "recordCashNominationFormAction",
  recordCashNominationFormActionImpl,
);
