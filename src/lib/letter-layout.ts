import { addressLines, letterDateLabel, type LetterInput } from "@/lib/validations/letter";

/**
 * Where the parts of a letter go on the page.
 *
 * Kept apart from whatever draws it, because the arrangement is the whole
 * service: somebody who cannot see their own page is trusting the
 * association to put their address where a Ghanaian office expects to
 * find it. Plain data here means the arrangement can be checked without
 * rendering anything.
 *
 * Semi-block, as taught in schools here: the writer's own address and the
 * date ranged right at the top, the recipient's on the left below them,
 * then the salutation and a heading in bold before the letter itself.
 */

export interface LetterLine {
  text: string;
  align: "left" | "right";
  bold?: boolean;
  underline?: boolean;
  /** Blank lines after this one, as a typist would leave them. */
  spaceAfter?: number;
}

/** Everything above the body of the letter, in the order it is printed. */
export function letterHeaderLines(letter: LetterInput, today: Date = new Date()): LetterLine[] {
  const lines: LetterLine[] = [];

  // The writer, top right.
  lines.push({ text: letter.senderName, align: "right", bold: true });
  for (const line of addressLines(letter.senderAddress)) lines.push({ text: line, align: "right" });
  if (letter.senderPhone) lines.push({ text: letter.senderPhone, align: "right" });
  if (letter.senderEmail) lines.push({ text: letter.senderEmail, align: "right" });

  // The date, under the writer's block and still to the right.
  lines.push({ text: letterDateLabel(letter.letterDate, today), align: "right", spaceAfter: 1 });

  // Who it is to, on the left.
  const recipient = [letter.recipientName, letter.recipientTitle, letter.recipientOrganisation].filter(
    (part): part is string => Boolean(part),
  );
  for (const part of recipient) lines.push({ text: part, align: "left" });
  const recipientAddress = addressLines(letter.recipientAddress);
  for (const line of recipientAddress) lines.push({ text: line, align: "left" });
  if (lines[lines.length - 1] && (recipient.length > 0 || recipientAddress.length > 0)) {
    lines[lines.length - 1].spaceAfter = 1;
  }

  lines.push({ text: `${letter.salutation},`, align: "left", spaceAfter: 1 });

  // The heading, which is what tells a busy office what the letter is
  // about before they have read any of it.
  if (letter.subject) {
    lines.push({ text: letter.subject.toUpperCase(), align: "left", bold: true, underline: true, spaceAfter: 1 });
  }

  return lines;
}
