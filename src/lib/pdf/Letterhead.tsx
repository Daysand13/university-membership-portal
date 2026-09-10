import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Letterhead for the admin list exports — the association's mark, its name,
 * and what the document is, over a gold rule.
 *
 * Rendered `fixed` by its callers so it repeats at the top of every page:
 * these lists run to several pages, and a page that gets separated from the
 * rest should still be identifiable as the association's own record.
 *
 * `logoDataUri` is nullable on purpose. The logo is fetched before render
 * (see logo.ts) and may legitimately be absent — not configured, or
 * temporarily unreachable — in which case the text letterhead stands on its
 * own rather than the export failing.
 */
const styles = StyleSheet.create({
  header: { marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  logo: { width: 38, height: 38, marginRight: 10, objectFit: "contain" },
  universityLogo: { width: 38, height: 38, marginLeft: 10, objectFit: "contain" },
  headings: { flex: 1 },
  title: { fontSize: 13, fontWeight: 700, color: "#14153d" },
  subtitle: { fontSize: 9, color: "#5b6b7c", marginTop: 2 },
  rule: { marginTop: 7, borderBottomWidth: 1.5, borderBottomColor: "#c9971f" },
  filterLine: { fontSize: 8, color: "#5b6b7c", marginTop: 6 },
});

export function Letterhead({
  logoDataUri,
  universityLogoDataUri = null,
  siteTitle,
  documentTitle,
  filterSummary,
}: {
  logoDataUri: string | null;
  /** The university's own crest, opposite the association's. Optional —
   *  the letterhead is balanced with or without it. */
  universityLogoDataUri?: string | null;
  siteTitle: string;
  documentTitle: string;
  filterSummary: string;
}) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.row}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image takes no alt */}
        {logoDataUri && <Image style={styles.logo} src={logoDataUri} />}
        <View style={styles.headings}>
          <Text style={styles.title}>{siteTitle}</Text>
          <Text style={styles.subtitle}>{documentTitle}</Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image takes no alt */}
        {universityLogoDataUri && <Image style={styles.universityLogo} src={universityLogoDataUri} />}
      </View>
      <View style={styles.rule} />
      <Text style={styles.filterLine}>{filterSummary}</Text>
    </View>
  );
}
