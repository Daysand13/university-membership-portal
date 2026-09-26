import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentMember } from "@/lib/auth/member";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { getLetter, letterToInput } from "@/lib/services/letter-service";
import { hasPaidFor } from "@/lib/services/document-purchase-service";
import { LetterPdf, letterFilename } from "@/lib/pdf/LetterPdf";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * One letter, laid out, as a PDF.
 *
 * The paywall is on the route rather than the button, so a link somebody
 * kept or was sent cannot hand out a letter that was never paid for — and
 * because letters are charged one at a time, the check names this letter
 * rather than asking whether they have ever paid for any.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response("Please sign in to your dashboard first.", { status: 401 });

  const { id } = await params;
  const letter = await getLetter({ kind: "member", id: member.id }, id);
  if (!letter) return new Response("We couldn't find that letter.", { status: 404 });

  const paid = await hasPaidFor(
    { kind: "member", id: member.id, email: member.email },
    PaidDocumentKind.LETTER,
    { letterId: letter.id },
  );
  if (!paid) {
    return new Response("This letter hasn't been paid for yet. Open it in your dashboard to pay for it.", {
      status: 402,
    });
  }

  const input = letterToInput(letter);
  const file = await renderToBuffer(<LetterPdf letter={input} />);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${letterFilename(input)}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
