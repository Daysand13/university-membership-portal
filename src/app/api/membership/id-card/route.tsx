import { NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth/member";
import { getSiteOrigin } from "@/lib/services/member-card-service";
import { getCurrentAcademicYear, hasPaidDuesForYear } from "@/lib/services/dues-service";
import { loadIdCardData } from "@/lib/id-card/id-card-service";
import { renderIdCardPdf, renderIdCardPng, type IdCardSide } from "@/lib/id-card/render";

// sharp, the PDF renderer and the font files all need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's own association ID card.
 *
 *   ?side=front|back   PNG, shown inline on their dashboard
 *   ?format=pdf        both sides, print-ready and card-sized
 *
 * Dues are what a card certifies, so they are checked here and not only on
 * the button: a link kept from last year must not still produce one. The
 * card is only ever the card of whoever is signed in.
 */
export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return new Response("Please sign in to your dashboard first.", { status: 401 });

  if (!(await hasPaidDuesForYear(member.id, getCurrentAcademicYear()))) {
    return new Response("Your dues for this academic year aren't paid, so there is no card to issue yet.", {
      status: 402,
    });
  }

  const sp = request.nextUrl.searchParams;
  const wantsPdf = sp.get("format") === "pdf";
  const side: IdCardSide = sp.get("side") === "back" ? "back" : "front";

  const data = await loadIdCardData(member.id, await getSiteOrigin());
  if (!data) return new Response("We couldn't find your record.", { status: 404 });

  const baseName = `ASSN-UEW-ID-${data.indexNumber.replace(/[^A-Za-z0-9-]+/g, "_")}`;

  try {
    if (wantsPdf) {
      const [front, back] = await Promise.all([renderIdCardPng("front", data), renderIdCardPng("back", data)]);
      const body = await renderIdCardPdf(front, back, `ID card — ${data.fullName}`);
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    const body = await renderIdCardPng(side, data);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${baseName}-${side}.png"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[id-card] rendering failed for member", member.id, err);
    return new Response("Your card couldn't be generated. Please try again.", { status: 500 });
  }
}
