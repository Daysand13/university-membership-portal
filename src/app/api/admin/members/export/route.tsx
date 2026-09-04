import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { listMembers } from "@/lib/services/membership-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { MEMBERSHIP_TYPE_LABELS } from "@/lib/validations/membership";
import { MemberListPdf } from "@/lib/pdf/MemberListPdf";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";

function buildFilterSummary(sp: URLSearchParams): string {
  const parts: string[] = [];
  if (sp.get("q")) parts.push(`Search: "${sp.get("q")}"`);
  if (sp.get("department")) parts.push(`Department: ${sp.get("department")}`);
  if (sp.get("programme")) parts.push(`Programme: ${sp.get("programme")}`);
  if (sp.get("membershipType")) {
    const key = sp.get("membershipType") as keyof typeof MEMBERSHIP_TYPE_LABELS;
    parts.push(`Membership Type: ${MEMBERSHIP_TYPE_LABELS[key] ?? key}`);
  }
  if (sp.get("gender")) parts.push(`Gender: ${sp.get("gender") === "MALE" ? "Male" : "Female"}`);
  if (sp.get("track")) parts.push(`Track: ${sp.get("track") === "UNDERGRADUATE" ? "Undergraduate" : "Postgraduate"}`);
  if (sp.get("campus")) parts.push(`Campus: ${sp.get("campus")}`);
  if (sp.get("status")) parts.push(`Status: ${sp.get("status")}`);
  if (sp.get("from")) parts.push(`From: ${sp.get("from")}`);
  if (sp.get("to")) parts.push(`To: ${sp.get("to")}`);
  return parts.length ? `Filters applied — ${parts.join(" · ")}` : "No filters applied — full member list";
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const [members, brand] = await Promise.all([
    listMembers({
      search: sp.get("q") ?? undefined,
      academicDepartment: sp.get("department") ?? undefined,
      programme: sp.get("programme") ?? undefined,
      membershipType: sp.get("membershipType") ?? undefined,
      gender: sp.get("gender") ?? undefined,
      applicationTrack: sp.get("track") ?? undefined,
      campus: sp.get("campus") ?? undefined,
      status: sp.get("status") ?? undefined,
      dateFrom: sp.get("from") ?? undefined,
      dateTo: sp.get("to") ?? undefined,
    }),
    getEmailBrand(),
  ]);

  const pdfBuffer = await renderToBuffer(
    <MemberListPdf members={members} siteTitle={brand.siteTitle} filterSummary={buildFilterSummary(sp)} />,
  );

  const filename = `member-list-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
