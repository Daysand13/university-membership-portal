import "server-only";
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
  type IParagraphOptions,
} from "docx";
import { SignatureKind } from "@/generated/prisma/client";
import { addressLines, letterDateLabel, paragraphsOf, type LetterInput } from "@/lib/validations/letter";

/**
 * A letter, laid out.
 *
 * Block format, which is what an office in Ghana expects: everything
 * flush left, the writer's address at the top, the date under it, the
 * recipient below that, a subject line in bold, then the body, then the
 * sign-off with room left for a signature.
 *
 * Word rather than PDF because the person receiving it often wants to
 * quote from it, and because the writer may want to hand it to somebody
 * else to check before it goes.
 */

const FONT = "Calibri";
const SIZE = 24; // half-points: 12pt
const LINE = 276; // 1.15 line spacing, in twentieths of a point

function line(text: string, options: IParagraphOptions = {}): Paragraph {
  return new Paragraph({
    spacing: { line: LINE },
    children: [new TextRun({ text, font: FONT, size: SIZE })],
    ...options,
  });
}

function blank(count = 1): Paragraph[] {
  return Array.from({ length: count }, () => new Paragraph({ children: [] }));
}

/** A drawn signature arrives as a PNG data URI; anything else is skipped. */
function signatureImage(dataUri: string): Paragraph | null {
  const base64 = dataUri.split(",")[1];
  if (!base64) return null;
  try {
    return new Paragraph({
      children: [
        new ImageRun({
          type: "png",
          data: Buffer.from(base64, "base64"),
          transformation: { width: 150, height: 50 },
        }),
      ],
    });
  } catch {
    // A picture that will not decode is not worth losing the letter over.
    return null;
  }
}

export async function renderLetterDocx(letter: LetterInput): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Who it is from, at the top.
  children.push(line(letter.senderName, { spacing: { line: LINE }, children: [new TextRun({ text: letter.senderName, font: FONT, size: SIZE, bold: true })] }));
  for (const address of addressLines(letter.senderAddress)) children.push(line(address));
  if (letter.senderPhone) children.push(line(letter.senderPhone));
  if (letter.senderEmail) children.push(line(letter.senderEmail));

  children.push(...blank());
  children.push(line(letterDateLabel(letter.letterDate)));
  children.push(...blank());

  // Who it is to.
  const recipientTop = [letter.recipientName, letter.recipientTitle, letter.recipientOrganisation].filter(Boolean);
  for (const part of recipientTop) children.push(line(part as string));
  for (const address of addressLines(letter.recipientAddress)) children.push(line(address));
  if (recipientTop.length > 0 || addressLines(letter.recipientAddress).length > 0) children.push(...blank());

  children.push(line(`${letter.salutation},`));
  children.push(...blank());

  // The subject, which is what tells a busy office what the letter is
  // about before they have read any of it.
  if (letter.subject) {
    children.push(
      new Paragraph({
        spacing: { line: LINE },
        children: [
          new TextRun({
            text: letter.subject.toUpperCase(),
            font: FONT,
            size: SIZE,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      }),
    );
    children.push(...blank());
  }

  for (const paragraph of paragraphsOf(letter.body)) {
    children.push(line(paragraph, { spacing: { line: LINE, after: 200 } }));
  }

  children.push(...blank());
  children.push(line(`${letter.closing},`));

  // Room for a signature: the drawn one if there is one, the typed
  // initials if there are, and otherwise the blank space somebody needs to
  // sign a printed copy by hand.
  if (letter.signatureKind === SignatureKind.DRAWN && letter.signatureData) {
    const image = signatureImage(letter.signatureData);
    children.push(image ?? new Paragraph({ children: [] }));
  } else if (letter.signatureKind === SignatureKind.TYPED && letter.signatureData) {
    children.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: letter.signatureData, font: "Segoe Script", size: 32 })],
      }),
    );
  } else {
    children.push(...blank(3));
  }

  children.push(
    new Paragraph({
      spacing: { before: 60 },
      children: [new TextRun({ text: letter.senderName, font: FONT, size: SIZE, bold: true })],
    }),
  );

  const document = new Document({
    creator: letter.senderName,
    title: letter.title,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [
      {
        properties: {
          page: {
            // A4 with one-inch margins, in twentieths of a point.
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document) as unknown as Promise<Buffer>;
}

/** A safe, recognisable filename for the download. */
export function letterFilename(letter: Pick<LetterInput, "title">): string {
  const stem = letter.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "letter";
  return `${stem}.docx`;
}

/** Deliberately re-exported so routes align on one alignment constant. */
export { AlignmentType };
