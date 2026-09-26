import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { SignatureKind } from "@/generated/prisma/enums";
import { letterHeaderLines } from "@/lib/letter-layout";
import { paragraphsOf, type LetterInput } from "@/lib/validations/letter";

/**
 * A letter, laid out and ready to print.
 *
 * PDF rather than Word, because that is what an office here accepts
 * without asking questions and what prints the same on every machine —
 * and because nobody can accidentally pull the writer's careful
 * arrangement apart on the way to delivering it.
 *
 * Where each part goes is decided in lib/letter-layout, not here.
 */

const INK = "#161c28";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 64,
    fontSize: 11.5,
    fontFamily: "Times-Roman",
    color: INK,
    lineHeight: 1.45,
  },
  line: { marginBottom: 1 },
  right: { textAlign: "right" },
  gap: { height: 12 },
  paragraph: { marginBottom: 10, textAlign: "justify" },
  closing: { marginTop: 14 },
  signatureImage: { width: 140, height: 44, objectFit: "contain", marginTop: 4 },
  signatureTyped: { fontSize: 17, fontFamily: "Times-Italic", marginTop: 6 },
  signatureSpace: { height: 46 },
  signatureName: { marginTop: 4, fontFamily: "Times-Bold" },
});

/** A drawn signature arrives as a PNG data URI; anything else is skipped. */
function drawnSignature(dataUri: string) {
  if (!dataUri.startsWith("data:image/")) return null;
  // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf's Image takes no alt
  return <Image style={styles.signatureImage} src={dataUri} />;
}

export function LetterPdf({ letter, today }: { letter: LetterInput; today?: Date }) {
  const header = letterHeaderLines(letter, today);
  const body = paragraphsOf(letter.body);

  return (
    <Document title={letter.title} author={letter.senderName}>
      <Page size="A4" style={styles.page}>
        {header.map((line, index) => (
          <View key={`${line.text}-${index}`} wrap={false}>
            <Text
              style={[
                styles.line,
                line.align === "right" ? styles.right : {},
                line.bold ? { fontFamily: "Times-Bold" } : {},
                line.underline ? { textDecoration: "underline" } : {},
              ]}
            >
              {line.text}
            </Text>
            {line.spaceAfter ? <View style={styles.gap} /> : null}
          </View>
        ))}

        {body.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        <View wrap={false} minPresenceAhead={90}>
          <Text style={styles.closing}>{letter.closing},</Text>

          {/* Room for a signature: the drawn one if there is one, the typed
              initials if there are, and otherwise the blank space somebody
              needs to sign a printed copy by hand. */}
          {letter.signatureKind === SignatureKind.DRAWN && letter.signatureData ? (
            (drawnSignature(letter.signatureData) ?? <View style={styles.signatureSpace} />)
          ) : letter.signatureKind === SignatureKind.TYPED && letter.signatureData ? (
            <Text style={styles.signatureTyped}>{letter.signatureData}</Text>
          ) : (
            <View style={styles.signatureSpace} />
          )}

          <Text style={styles.signatureName}>{letter.senderName}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** A safe, recognisable filename for the download. */
export function letterFilename(letter: Pick<LetterInput, "title">): string {
  const stem = letter.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "letter";
  return `${stem}.pdf`;
}
