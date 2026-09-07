import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AlumniProfile } from "@/generated/prisma/client";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#5b6b7c", marginBottom: 3 },
  filterLine: { fontSize: 8, color: "#5b6b7c", marginBottom: 10 },
  table: { display: "flex", width: "100%", borderWidth: 1, borderColor: "#e2e8f0" },
  headerRow: { flexDirection: "row", backgroundColor: "#24266B" },
  headerCell: { color: "#ffffff", fontWeight: 700, padding: 5, fontSize: 7.5 },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  rowAlt: { backgroundColor: "#f6f8fb" },
  cell: { padding: 5, fontSize: 7.5, color: "#131b23" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    fontSize: 7,
    color: "#8b98a6",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// Relative column widths, summing to 100.
const COLS = [
  { key: "name", label: "Name", width: 18 },
  { key: "email", label: "Email", width: 20 },
  { key: "programme", label: "Programme", width: 22 },
  { key: "classOf", label: "Class of", width: 8 },
  { key: "source", label: "Source", width: 12 },
  { key: "status", label: "Status", width: 8 },
  { key: "joined", label: "Joined", width: 12 },
] as const;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function AlumniListPdf({
  alumni,
  siteTitle,
  filterSummary,
}: {
  alumni: AlumniProfile[];
  siteTitle: string;
  filterSummary: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{siteTitle}</Text>
        <Text style={styles.subtitle}>Alumni List — {alumni.length} alumnus{alumni.length === 1 ? "" : "es"}</Text>
        <Text style={styles.filterLine}>{filterSummary}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow} fixed>
            {COLS.map((col) => (
              <Text key={col.key} style={[styles.headerCell, { width: `${col.width}%` }]}>
                {col.label}
              </Text>
            ))}
          </View>

          {alumni.map((a, i) => (
            <View key={a.id} style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]} wrap={false}>
              <Text style={[styles.cell, { width: `${COLS[0].width}%` }]}>{a.fullName}</Text>
              <Text style={[styles.cell, { width: `${COLS[1].width}%` }]}>{a.email}</Text>
              <Text style={[styles.cell, { width: `${COLS[2].width}%` }]}>{a.programme}</Text>
              <Text style={[styles.cell, { width: `${COLS[3].width}%` }]}>{a.graduationYear}</Text>
              <Text style={[styles.cell, { width: `${COLS[4].width}%` }]}>
                {a.sourceMemberId ? "Graduated member" : "Self-registered"}
              </Text>
              <Text style={[styles.cell, { width: `${COLS[5].width}%` }]}>{a.status}</Text>
              <Text style={[styles.cell, { width: `${COLS[6].width}%` }]}>{formatDate(a.createdAt)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Generated {new Date().toLocaleString("en-GH")}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
