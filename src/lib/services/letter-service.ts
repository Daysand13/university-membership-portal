import "server-only";
import { db } from "@/lib/db";
import { EMPTY_LETTER, type LetterInput } from "@/lib/validations/letter";
import type { CvOwner } from "@/lib/services/cv-service";

/**
 * Letters somebody has written.
 *
 * Kept as drafts from the first save, so a letter can be written over
 * several sittings and corrected after it has been read back — which
 * matters more here than elsewhere, because the person writing it often
 * cannot skim their own page to check it.
 */

function ownerWhere(owner: CvOwner) {
  return owner.kind === "member" ? { memberId: owner.id } : { alumniProfileId: owner.id };
}

export async function listLetters(owner: CvOwner) {
  return db.memberLetter.findMany({
    where: ownerWhere(owner),
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, subject: true, recipientName: true, updatedAt: true },
  });
}

/** One letter, and only if it belongs to whoever is asking. */
export async function getLetter(owner: CvOwner, letterId: string) {
  return db.memberLetter.findFirst({ where: { id: letterId, ...ownerWhere(owner) } });
}

export function letterToInput(row: NonNullable<Awaited<ReturnType<typeof getLetter>>>): LetterInput {
  return {
    ...EMPTY_LETTER,
    title: row.title,
    senderName: row.senderName,
    senderAddress: row.senderAddress ?? "",
    senderPhone: row.senderPhone ?? "",
    senderEmail: row.senderEmail ?? "",
    letterDate: row.letterDate ? row.letterDate.toISOString().slice(0, 10) : "",
    recipientName: row.recipientName ?? "",
    recipientTitle: row.recipientTitle ?? "",
    recipientOrganisation: row.recipientOrganisation ?? "",
    recipientAddress: row.recipientAddress ?? "",
    salutation: row.salutation,
    subject: row.subject ?? "",
    body: row.body,
    closing: row.closing,
    signatureKind: row.signatureKind,
    signatureData: row.signatureData ?? "",
  };
}

function toRow(letter: LetterInput) {
  return {
    title: letter.title,
    senderName: letter.senderName,
    senderAddress: letter.senderAddress || null,
    senderPhone: letter.senderPhone || null,
    senderEmail: letter.senderEmail || null,
    letterDate: letter.letterDate ? new Date(`${letter.letterDate}T12:00:00Z`) : null,
    recipientName: letter.recipientName || null,
    recipientTitle: letter.recipientTitle || null,
    recipientOrganisation: letter.recipientOrganisation || null,
    recipientAddress: letter.recipientAddress || null,
    salutation: letter.salutation,
    subject: letter.subject || null,
    body: letter.body,
    closing: letter.closing,
    signatureKind: letter.signatureKind,
    signatureData: letter.signatureData || null,
  };
}

export async function createLetter(owner: CvOwner, letter: LetterInput) {
  return db.memberLetter.create({ data: { ...ownerWhere(owner), ...toRow(letter) } });
}

/** Updates a letter, but only one the asker owns. */
export async function updateLetter(owner: CvOwner, letterId: string, letter: LetterInput) {
  const existing = await getLetter(owner, letterId);
  if (!existing) return null;
  return db.memberLetter.update({ where: { id: existing.id }, data: toRow(letter) });
}

/**
 * Removes a letter.
 *
 * A letter that has been paid for is kept: the purchase points at it, and
 * somebody who paid for a letter should be able to download it again
 * rather than find it gone.
 */
export async function deleteLetter(owner: CvOwner, letterId: string): Promise<{ ok: boolean; error?: string }> {
  const existing = await db.memberLetter.findFirst({
    where: { id: letterId, ...ownerWhere(owner) },
    include: { purchases: { where: { status: "SUCCESS" }, select: { id: true } } },
  });
  if (!existing) return { ok: false, error: "That letter is not yours, or no longer exists." };
  if (existing.purchases.length > 0) {
    return { ok: false, error: "You paid for this one, so it stays — you can download it again whenever you like." };
  }

  await db.memberLetter.delete({ where: { id: existing.id } });
  return { ok: true };
}
