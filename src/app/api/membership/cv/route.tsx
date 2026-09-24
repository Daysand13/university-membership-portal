import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentMember } from "@/lib/auth/member";
import { PaidDocumentKind } from "@/generated/prisma/client";
import { loadCvDocument } from "@/lib/services/cv-service";
import { hasPaidFor } from "@/lib/services/document-purchase-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { cvHasSubstance } from "@/lib/validations/cv";
import { MemberCvPdf } from "@/lib/pdf/MemberCvPdf";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * A member's own CV, as a PDF.
 *
 * The paywall is here rather than on the button: a link somebody kept from
 * a friend must not hand out a document that was never paid for. It reads
 * the session itself and will only ever produce the CV of whoever is
 * signed in.
 */
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return new Response("Please sign in to your dashboard first.", { status: 401 });

  if (!(await hasPaidFor(member.id, PaidDocumentKind.CV))) {
    return new Response("This CV hasn't been paid for yet. Open your dashboard to pay for it.", { status: 402 });
  }

  const [document, brand] = await Promise.all([loadCvDocument(member.id), getEmailBrand()]);
  if (!document) return new Response("We couldn't find your record.", { status: 404 });

  if (!cvHasSubstance(document.cv)) {
    return new Response("Fill in your CV before downloading it — a page with only a name on it helps nobody.", {
      status: 409,
    });
  }

  const pdfBuffer = await renderToBuffer(<MemberCvPdf document={document} associationName={brand.siteTitle} />);

  const filename = `${document.fullName.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}-cv.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
