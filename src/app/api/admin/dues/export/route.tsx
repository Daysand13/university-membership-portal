import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import type { DuesFilter } from "@/lib/services/dues-service";
import {
  describeDuesFilter,
  filterDuesRows,
  getCurrentAcademicYear,
  listMemberDuesStatus,
} from "@/lib/services/dues-service";
import { getEmailBrand } from "@/lib/services/content-service";
import { DuesLedgerPdf } from "@/lib/pdf/DuesLedgerPdf";
import { loadLogoDataUri } from "@/lib/pdf/logo";

// @react-pdf/renderer needs the full Node runtime (it isn't Edge-compatible).
export const runtime = "nodejs";
// A ledger has to be the ledger as it is now — never a cached copy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/** "2026/2027" — the only shape an academic year query may take. */
const YEAR_PATTERN = /^\d{4}\/\d{4}$/;

function cedis(pesewas: number): string {
  return (pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The dues ledger, as a document rather than a spreadsheet: it is signed,
 * filed and handed to auditors, and a page with the association's
 * letterhead and the totals already worked out is what that job wants.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Please sign in to the admin area first.", { status: 401 });
  if (admin.role !== AdminRole.SUPER_ADMIN && admin.role !== AdminRole.MEMBERSHIP_OFFICER) {
    return new Response("You don't have access to the dues ledger.", { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get("year");
  const academicYear = requested && YEAR_PATTERN.test(requested) ? requested : getCurrentAcademicYear();

  // The same narrowing the Dues screen applied, so the document that
  // downloads is the rows the officer was looking at.
  const statusParam = request.nextUrl.searchParams.get("status");
  const filter: DuesFilter = {
    status: statusParam === "paid" || statusParam === "unpaid" ? statusParam : undefined,
    search: request.nextUrl.searchParams.get("q") ?? undefined,
  };

  const [allRows, brand] = await Promise.all([listMemberDuesStatus(academicYear), getEmailBrand()]);
  const rows = filterDuesRows(allRows, filter);

  const expectedPesewas = rows.reduce((total, row) => total + row.fee.amountPesewas, 0);
  const collectedPesewas = rows.reduce((total, row) => total + (row.payment?.amountPesewas ?? 0), 0);

  // Loaded before the render rather than during it, so a logo that can't be
  // fetched costs the ledger its letterhead mark and nothing more.
  const [logoDataUri, universityLogoDataUri] = await Promise.all([
    loadLogoDataUri(brand.logoUrl),
    loadLogoDataUri(brand.universityLogoUrl),
  ]);

  const pdfBuffer = await renderToBuffer(
    <DuesLedgerPdf
      academicYear={academicYear}
      filterSummary={describeDuesFilter(filter)}
      rows={rows.map((row) => ({
        fullName: row.fullName,
        indexNumber: row.indexNumber,
        level: row.level,
        tierLabel: row.fee.tierLabel,
        feeCedis: cedis(row.fee.amountPesewas),
        paid: row.paid,
        method: row.payment ? (row.payment.method === "cash" ? "Cash" : "Online") : "—",
        amountCedis: row.payment ? cedis(row.payment.amountPesewas) : "—",
        paidOn: row.paidAt ? dateFormat.format(row.paidAt) : "—",
      }))}
      collectedPesewas={collectedPesewas}
      expectedPesewas={expectedPesewas}
      logoDataUri={logoDataUri}
      universityLogoDataUri={universityLogoDataUri}
    />,
  );

  const filename = `dues-ledger-${academicYear.replace("/", "-")}.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
