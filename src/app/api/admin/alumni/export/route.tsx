import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { listAlumniForAdmin, ALUMNI_SORT_FIELDS, type AlumniSortField } from "@/lib/services/alumni-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { AlumniListPdf } from "@/lib/pdf/AlumniListPdf";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildFilterSummary(sp: URLSearchParams): string {
  const parts: string[] = [];
  if (sp.get("q")) parts.push(`Search: "${sp.get("q")}"`);
  const sort = sp.get("sort");
  if (sort === "name") parts.push("Sorted by name");
  if (sort === "graduationYear") parts.push("Sorted by graduation year");
  return parts.length ? `Filters applied — ${parts.join(" · ")}` : "No filters applied — full alumni list";
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const rawSort = sp.get("sort");
  const sort: AlumniSortField | undefined = (ALUMNI_SORT_FIELDS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as AlumniSortField)
    : undefined;

  const [alumni, brand] = await Promise.all([
    listAlumniForAdmin({ search: sp.get("q") ?? undefined, sort }),
    getEmailBrand(),
  ]);

  const pdfBuffer = await renderToBuffer(
    <AlumniListPdf alumni={alumni} siteTitle={brand.siteTitle} filterSummary={buildFilterSummary(sp)} />,
  );

  const filename = `alumni-list-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
