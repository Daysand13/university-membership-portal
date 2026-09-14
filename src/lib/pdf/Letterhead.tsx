import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Letterhead for the admin list exports: the association's logo on the left,
 * the university's on the right, and between them — centred — the
 * association's name, the university's name beneath it, and what the
 * document is, over a gold rule.
 *
 * Rendered `fixed` by its callers so it repeats at the top of every page:
 * these lists run to several pages, and a page that gets separated from the
 * rest should still be identifiable as the association's own record.
 *
 * Both logos are nullable on purpose. They're fetched before render (see
 * logo.ts) and may legitimately be absent — not configured, or temporarily
 * unreachable. A missing logo keeps its space, so the names stay centred on
 * the page rather than shifting toward whichever side is empty.
 */
export const LETTERHEAD_ASSOCIATION = "ASSOCIATION OF STUDENTS WITH SPECIAL NEEDS";
export const LETTERHEAD_UNIVERSITY = "UNIVERSITY OF EDUCATION, WINNEBA";

const LOGO_SIZE = 44;

const styles = StyleSheet.create({
  header: { marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  logoSlot: { width: LOGO_SIZE, height: LOGO_SIZE },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, objectFit: "contain" },
  headings: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  association: { fontSize: 14, fontWeight: 700, color: "#14153d", textAlign: "center", letterSpacing: 0.4 },
  university: { fontSize: 10, fontWeight: 700, color: "#24266B", textAlign: "center", marginTop: 3, letterSpacing: 1.2 },
  documentTitle: { fontSize: 9, color: "#5b6b7c", textAlign: "center", marginTop: 4 },
  rule: { marginTop: 8, borderBottomWidth: 1.5, borderBottomColor: "#c9971f" },
  filterLine: { fontSize: 8, color: "#5b6b7c", marginTop: 6 },
});

function LogoSlot({ src }: { src: string | null }) {
  return (
    <View style={styles.logoSlot}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image takes no alt */}
      {src && <Image style={styles.logo} src={src} />}
    </View>
  );
}

export function Letterhead({
  logoDataUri,
  universityLogoDataUri = null,
  documentTitle,
  filterSummary,
}: {
  logoDataUri: string | null;
  /** The university's own crest, opposite the association's. */
  universityLogoDataUri?: string | null;
  documentTitle: string;
  filterSummary: string;
}) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.row}>
        <LogoSlot src={logoDataUri} />
        <View style={styles.headings}>
          <Text style={styles.association}>{LETTERHEAD_ASSOCIATION}</Text>
          <Text style={styles.university}>{LETTERHEAD_UNIVERSITY}</Text>
          <Text style={styles.documentTitle}>{documentTitle}</Text>
        </View>
        <LogoSlot src={universityLogoDataUri} />
      </View>
      <View style={styles.rule} />
      <Text style={styles.filterLine}>{filterSummary}</Text>
    </View>
  );
}
