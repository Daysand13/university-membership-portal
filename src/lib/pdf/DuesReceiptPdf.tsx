import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { Letterhead } from "@/lib/pdf/Letterhead";

/**
 * The official receipt for a membership dues payment — sent as a PDF with
 * the payment email, and downloadable from the member's Dues & Payments page
 * and Admin > Dues. One layout for online and cash payments alike, so a
 * receipt looks the same however someone paid.
 */

export interface DuesReceiptData {
  /** The payment reference; doubles as the receipt number. */
  reference: string;
  paidAt: Date;
  memberName: string;
  indexNumber: string;
  programme: string;
  level: string;
  academicYear: string;
  tierLabel: string;
  /** e.g. "GHS 50.00" */
  amountLabel: string;
  method: "online" | "cash";
  /** Paystack's transaction ID, for online payments. */
  transactionId: string | null;
  logoDataUri: string | null;
  universityLogoDataUri: string | null;
  /** e.g. "www.assnuew.com" */
  website: string | null;
  generatedAt: Date;
}

const INK = "#131b23";
const MUTED = "#5b6b7c";
const NAVY = "#24266B";
const LINE = "#e2e8f0";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: INK },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginTop: 18,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
  },
  payer: { flex: 1, padding: 16 },
  label: { fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: 1 },
  payerName: { fontSize: 15, fontWeight: 700, marginTop: 4 },
  payerMeta: { fontSize: 10, color: MUTED, marginTop: 3 },
  amountBox: { width: 170, padding: 16, backgroundColor: NAVY, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  amountLabel: { fontSize: 8, fontWeight: 700, color: "#c7cbe8", letterSpacing: 1 },
  amount: { fontSize: 22, fontWeight: 700, color: "#ffffff", marginTop: 4 },
  paidBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: "#c9971f",
    color: "#14153d",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
  },
  table: { marginTop: 18, borderTopWidth: 1, borderTopColor: LINE },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 8 },
  rowLabel: { width: 150, color: MUTED },
  rowValue: { flex: 1, fontWeight: 700 },
  note: { marginTop: 16, fontSize: 10, lineHeight: 1.5 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 30, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  footerText: { fontSize: 8, color: MUTED, lineHeight: 1.5, textAlign: "center" },
});

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Accra" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Accra" });

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function DuesReceiptPdf({ data }: { data: DuesReceiptData }) {
  const cash = data.method === "cash";

  return (
    <Document title={`Dues receipt ${data.reference}`} author="Association of Students with Special Needs, UEW">
      <Page size="A4" style={styles.page}>
        <Letterhead
          logoDataUri={data.logoDataUri}
          universityLogoDataUri={data.universityLogoDataUri}
          documentTitle="Official Receipt — Membership Dues"
          filterSummary={`Receipt No. ${data.reference}`}
        />

        <View style={styles.summary}>
          <View style={styles.payer}>
            <Text style={styles.label}>RECEIVED WITH THANKS FROM</Text>
            <Text style={styles.payerName}>{data.memberName}</Text>
            <Text style={styles.payerMeta}>Index No. {data.indexNumber}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>AMOUNT PAID</Text>
            <Text style={styles.amount}>{data.amountLabel}</Text>
            <Text style={styles.paidBadge}>PAID</Text>
          </View>
        </View>

        <View style={styles.table}>
          <Row label="Receipt number" value={data.reference} />
          <Row label="Date paid" value={dateFormat.format(data.paidAt)} />
          <Row label="Payment for" value={`Membership dues, ${data.academicYear} academic year`} />
          <Row label="Dues tier" value={data.tierLabel} />
          <Row label="Programme" value={data.programme} />
          <Row label="Level" value={data.level} />
          <Row label="Payment method" value={cash ? "Cash" : "Online (Paystack)"} />
          {!cash && data.transactionId && <Row label="Transaction ID" value={data.transactionId} />}
        </View>

        <Text style={styles.note}>
          {cash
            ? "Paid in cash to the association and recorded on the member's account."
            : "Paid online through Paystack and confirmed with Paystack before this receipt was issued."}{" "}
          The member&apos;s dues for the {data.academicYear} academic year are fully paid.
        </Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This is a computer-generated receipt from the Association of Students with Special Needs, University of
            Education, Winneba.
          </Text>
          <Text style={styles.footerText}>
            Generated {dateTimeFormat.format(data.generatedAt)}
            {data.website ? ` · ${data.website}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderDuesReceiptBuffer(data: DuesReceiptData): Promise<Buffer> {
  return renderToBuffer(<DuesReceiptPdf data={data} />);
}
