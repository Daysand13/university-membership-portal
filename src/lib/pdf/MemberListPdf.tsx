import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Member } from "@/generated/prisma/client";
import { MEMBERSHIP_TYPE_LABELS } from "@/lib/validations/membership";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Helvetica" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#5b6b7c", marginBottom: 3 },
  filterLine: { fontSize: 8, color: "#5b6b7c", marginBottom: 10 },
  table: { display: "flex", width: "100%", borderWidth: 1, borderColor: "#e2e8f0" },
  headerRow: { flexDirection: "row", backgroundColor: "#123A73" },
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
  { key: "name", label: "Name", width: 15 },
  { key: "index", label: "Index Number", width: 12 },
  { key: "gender", label: "Gender", width: 7 },
  { key: "department", label: "Academic Department", width: 20 },
  { key: "programme", label: "Programme", width: 20 },
  { key: "level", label: "Level", width: 8 },
  { key: "membershipType", label: "Membership Type", width: 9 },
  { key: "joined", label: "Joined", width: 9 },
] as const;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function MemberListPdf({
  members,
  siteTitle,
  filterSummary,
}: {
  members: Member[];
  siteTitle: string;
  filterSummary: string;
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{siteTitle}</Text>
        <Text style={styles.subtitle}>Member List — {members.length} member{members.length === 1 ? "" : "s"}</Text>
        <Text style={styles.filterLine}>{filterSummary}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow} fixed>
            {COLS.map((col) => (
              <Text key={col.key} style={[styles.headerCell, { width: `${col.width}%` }]}>
                {col.label}
              </Text>
            ))}
          </View>

          {members.map((member, i) => (
            <View key={member.id} style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]} wrap={false}>
              <Text style={[styles.cell, { width: `${COLS[0].width}%` }]}>
                {member.firstName} {member.lastName}
              </Text>
              <Text style={[styles.cell, { width: `${COLS[1].width}%` }]}>{member.indexNumber}</Text>
              <Text style={[styles.cell, { width: `${COLS[2].width}%` }]}>{member.gender ?? "—"}</Text>
              <Text style={[styles.cell, { width: `${COLS[3].width}%` }]}>{member.academicDepartment ?? "—"}</Text>
              <Text style={[styles.cell, { width: `${COLS[4].width}%` }]}>{member.programme}</Text>
              <Text style={[styles.cell, { width: `${COLS[5].width}%` }]}>{member.level}</Text>
              <Text style={[styles.cell, { width: `${COLS[6].width}%` }]}>
                {member.membershipType ? MEMBERSHIP_TYPE_LABELS[member.membershipType] : "—"}
              </Text>
              <Text style={[styles.cell, { width: `${COLS[7].width}%` }]}>{formatDate(member.createdAt)}</Text>
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
