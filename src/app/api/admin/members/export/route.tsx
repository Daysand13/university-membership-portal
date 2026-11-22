import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminCan, getCurrentAdmin } from "@/lib/auth/admin";
import { listMembers } from "@/lib/services/membership-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { describeMemberFilter, memberFilterFrom } from "@/lib/member-filters";
import { MemberListPdf } from "@/lib/pdf/MemberListPdf";
import { loadLogoDataUri } from "@/lib/pdf/logo";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";
// Always pull a fresh member list — this must never serve a cached PDF from
// a previous export, at any layer (Next's route cache, Vercel's edge, or
// the browser).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildFilterSummary(parts: string[]): string {
  return parts.length ? `Filters applied — ${parts.join(" · ")}` : "No filters applied — full member list";
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }
  // The same permission the Members page itself needs. Being signed in as
  // an administrator was all this used to ask — so a role with no access to
  // member records could still download every member's email address.
  if (!adminCan(admin, "members.records")) {
    return new Response("You do not have permission to execute this action.", { status: 403 });
  }

  // Read exactly as the page reads it, so the PDF is the list on screen.
  const filter = memberFilterFrom(request.nextUrl.searchParams);

  const [members, brand] = await Promise.all([listMembers(filter), getEmailBrand()]);

  // Loaded before the render rather than during it, so a logo that can't be
  // fetched costs the export its letterhead mark and nothing more.
  const [logoDataUri, universityLogoDataUri] = await Promise.all([
    loadLogoDataUri(brand.logoUrl),
    loadLogoDataUri(brand.universityLogoUrl),
  ]);

  const pdfBuffer = await renderToBuffer(
    <MemberListPdf
      members={members}
      filterSummary={buildFilterSummary(describeMemberFilter(filter))}
      logoDataUri={logoDataUri}
      universityLogoDataUri={universityLogoDataUri}
    />,
  );

  const filename = `member-list-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
