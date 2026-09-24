import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Letterhead } from "@/lib/pdf/Letterhead";

/**
 * The dues ledger as the Financial Secretary would file it.
 *
 * Every student who owes dues for the year, whether they have paid, how and
 * how much — the same rows the Dues screen shows, in the same order, with
 * the totals worked out at the top so the page can be signed and kept
 * without anybody adding a column up by hand.
 */

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  summary: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryBox: { borderWidth: 1, borderColor: "#e2e8f0", padding: 7, flexGrow: 1 },
  summaryLabel: { fontSize: 7, color: "#5b6b7c", textTransform: "uppercase" },
  summaryValue: { fontSize: 12, fontWeight: 700, color: "#131b23", marginTop: 2 },
  table: { display: "flex", width: "100%", borderWidth: 1, borderColor: "#e2e8f0" },
  headerRow: { flexDirection: "row", backgroundColor: "#24266B" },
  headerCell: { color: "#ffffff", fontWeight: 700, padding: 5, fontSize: 7.5 },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  rowAlt: { backgroundColor: "#f6f8fb" },
  cell: { padding: 5, fontSize: 7.5, color: "#131b23" },
  unpaid: { color: "#b3261e", fontWeight: 700 },
  paid: { color: "#1b6b3a", fontWeight: 700 },
  right: { textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: "#8b98a6",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// Relative column widths, summing to 100. Money is right-aligned so a
// column of figures can be read down.
const COLS: { key: string; label: string; width: number; right?: boolean }[] = [
  { key: "name", label: "Name", width: 20 },
  { key: "index", label: "Index Number", width: 13 },
  { key: "level", label: "Level", width: 7 },
  { key: "tier", label: "Fee Tier", width: 16 },
  { key: "fee", label: "Fee (GHS)", width: 9, right: true },
  { key: "paid", label: "Paid", width: 6 },
  { key: "method", label: "Method", width: 8 },
  { key: "amount", label: "Amount (GHS)", width: 11, right: true },
  { key: "on", label: "Paid On", width: 10 },
];

export interface DuesLedgerRow {
  fullName: string;
  indexNumber: string;
  level: string;
  tierLabel: string;
  feeCedis: string;
  paid: boolean;
  method: string;
  amountCedis: string;
  paidOn: string;
}

function cedis(pesewas: number): string {
  return `GH₵${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DuesLedgerPdf({
  academicYear,
  rows,
  collectedPesewas,
  expectedPesewas,
  filterSummary = "",
  logoDataUri = null,
  universityLogoDataUri = null,
}: {
  academicYear: string;
  rows: DuesLedgerRow[];
  collectedPesewas: number;
  expectedPesewas: number;
  /** Which rows these are, when they aren't all of them. */
  filterSummary?: string;
  logoDataUri?: string | null;
  universityLogoDataUri?: string | null;
}) {
  const paidCount = rows.filter((row) => row.paid).length;
  const outstanding = Math.max(0, expectedPesewas - collectedPesewas);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Letterhead
          logoDataUri={logoDataUri}
          universityLogoDataUri={universityLogoDataUri}
          documentTitle={`Dues Ledger — ${academicYear}`}
          filterSummary={
            filterSummary
              ? `${rows.length} of the roll for ${academicYear} · ${filterSummary}`
              : `${rows.length} member${rows.length === 1 ? "" : "s"} on the roll for ${academicYear}`
          }
        />

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={styles.summaryValue}>{cedis(collectedPesewas)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>{cedis(outstanding)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Expected in full</Text>
            <Text style={styles.summaryValue}>{cedis(expectedPesewas)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Paid up</Text>
            <Text style={styles.summaryValue}>
              {paidCount} of {rows.length}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow} fixed>
            {COLS.map((col) => (
              <Text
                key={col.key}
                style={[styles.headerCell, { width: `${col.width}%` }, ...(col.right ? [styles.right] : [])]}
              >
                {col.label}
              </Text>
            ))}
          </View>

          {rows.map((row, index) => (
            <View key={row.indexNumber} style={[styles.row, ...(index % 2 === 1 ? [styles.rowAlt] : [])]} wrap={false}>
              <Text style={[styles.cell, { width: `${COLS[0].width}%` }]}>{row.fullName}</Text>
              <Text style={[styles.cell, { width: `${COLS[1].width}%` }]}>{row.indexNumber}</Text>
              <Text style={[styles.cell, { width: `${COLS[2].width}%` }]}>{row.level}</Text>
              <Text style={[styles.cell, { width: `${COLS[3].width}%` }]}>{row.tierLabel}</Text>
              <Text style={[styles.cell, styles.right, { width: `${COLS[4].width}%` }]}>{row.feeCedis}</Text>
              <Text style={[styles.cell, row.paid ? styles.paid : styles.unpaid, { width: `${COLS[5].width}%` }]}>
                {row.paid ? "Yes" : "No"}
              </Text>
              <Text style={[styles.cell, { width: `${COLS[6].width}%` }]}>{row.method}</Text>
              <Text style={[styles.cell, styles.right, { width: `${COLS[7].width}%` }]}>{row.amountCedis}</Text>
              <Text style={[styles.cell, { width: `${COLS[8].width}%` }]}>{row.paidOn}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Dues ledger · {academicYear}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
