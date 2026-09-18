import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { AdminRole } from "@/generated/prisma/client";
import { getCurrentAcademicYear, listMemberDuesStatus } from "@/lib/services/dues-service";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
// A ledger has to be the ledger as it is now — never a cached copy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const dateFormat = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Africa/Accra" });

/** "2026/2027" — the only shape an academic year query may take. */
const YEAR_PATTERN = /^\d{4}\/\d{4}$/;

/**
 * The dues ledger as a spreadsheet: every student who owes dues for the year,
 * whether they've paid, how and how much. For the Financial Secretary's own
 * records and for audit — the same rows /admin/dues shows, in the same order.
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Please sign in to the admin area first.", { status: 401 });
  if (admin.role !== AdminRole.SUPER_ADMIN && admin.role !== AdminRole.MEMBERSHIP_OFFICER) {
    return new Response("You don't have access to the dues ledger.", { status: 403 });
  }

  const requested = request.nextUrl.searchParams.get("year");
  const academicYear = requested && YEAR_PATTERN.test(requested) ? requested : getCurrentAcademicYear();
  const rows = await listMemberDuesStatus(academicYear);

  const csv = toCsv([
    ["Academic year", "Name", "Index number", "Level", "Fee tier", "Fee (GHS)", "Paid", "Method", "Amount paid (GHS)", "Paid on"],
    ...rows.map((row) => [
      academicYear,
      row.fullName,
      row.indexNumber,
      row.level,
      row.fee.tierLabel,
      (row.fee.amountPesewas / 100).toFixed(2),
      row.paid ? "Yes" : "No",
      row.payment ? (row.payment.method === "cash" ? "Cash" : "Online") : "",
      row.payment ? (row.payment.amountPesewas / 100).toFixed(2) : "",
      row.paidAt ? dateFormat.format(row.paidAt) : "",
    ]),
  ]);

  const filename = `dues-ledger-${academicYear.replace("/", "-")}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
