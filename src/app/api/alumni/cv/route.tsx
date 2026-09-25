import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentAlumni } from "@/lib/auth/alumni";
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
 * A graduate's own CV, as a PDF.
 *
 * The paywall is here rather than on the button, so a link somebody kept
 * cannot hand out a document that was never paid for — and because a
 * graduate's payment runs out, the check is "is it still good", not "was
 * it ever made".
 */
export async function GET() {
  const alumnus = await getCurrentAlumni();
  if (!alumnus) return new Response("Please sign in to the alumni portal first.", { status: 401 });

  const owner = { kind: "alumni" as const, id: alumnus.id, email: alumnus.email };
  if (!(await hasPaidFor(owner, PaidDocumentKind.CV))) {
    return new Response("Your CV isn't paid up. Open the alumni portal to renew it.", { status: 402 });
  }

  const [document, brand] = await Promise.all([
    loadCvDocument({ kind: "alumni", id: alumnus.id }),
    getEmailBrand(),
  ]);
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
