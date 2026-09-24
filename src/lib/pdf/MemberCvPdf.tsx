import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CvDocument } from "@/lib/services/cv-service";

/**
 * A member's CV, as something they would actually hand to an employer.
 *
 * Deliberately plain: no association letterhead across the top, no heavy
 * colour, nothing that makes it look like a certificate rather than a CV.
 * The association's part is one quiet line at the foot of the page. What
 * an employer should notice is the person.
 */

const INK = "#161c28";
const MUTED = "#5b6478";
const RULE = "#c9d0dc";

const styles = StyleSheet.create({
  page: { paddingVertical: 42, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: INK },
  name: { fontSize: 24, fontWeight: 700, letterSpacing: 0.4 },
  headline: { fontSize: 11, color: MUTED, marginTop: 3 },
  contact: { fontSize: 9.5, color: MUTED, marginTop: 6 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: INK, marginTop: 12, marginBottom: 16 },

  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    paddingBottom: 3,
    marginBottom: 8,
  },

  entry: { marginBottom: 9 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryTitle: { fontSize: 10.5, fontWeight: 700, flex: 1, paddingRight: 10 },
  entryPeriod: { fontSize: 9, color: MUTED },
  entrySub: { fontSize: 9.5, color: MUTED, marginTop: 1 },
  entryBody: { fontSize: 9.5, marginTop: 3, lineHeight: 1.45 },

  summary: { fontSize: 10, lineHeight: 1.5 },

  inlineList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    fontSize: 9,
    borderWidth: 0.75,
    borderColor: RULE,
    borderRadius: 3,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
  },

  refereeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  referee: { width: "46%", marginBottom: 8 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 0.75,
    borderTopColor: RULE,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function MemberCvPdf({ document, associationName }: { document: CvDocument; associationName: string }) {
  const { cv } = document;
  const contactLine = [document.email, document.phone, cv.location].filter(Boolean).join("  ·  ");

  return (
    <Document title={`${document.fullName} — CV`} author={document.fullName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{document.fullName.toUpperCase()}</Text>
        {cv.headline ? <Text style={styles.headline}>{cv.headline}</Text> : null}
        <Text style={styles.contact}>{contactLine}</Text>
        <View style={styles.rule} />

        {cv.summary ? (
          <Section title="Profile">
            <Text style={styles.summary}>{cv.summary}</Text>
          </Section>
        ) : null}

        <Section title="Education">
          {/* The current programme comes from the membership register, so a
              CV can never quietly disagree with what the association holds. */}
          <View style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryTitle}>{document.programme}</Text>
              <Text style={styles.entryPeriod}>Level {document.level}</Text>
            </View>
            <Text style={styles.entrySub}>University of Education, Winneba · {document.indexNumber}</Text>
          </View>

          {cv.education.map((entry, i) => (
            <View key={`edu-${i}`} style={styles.entry}>
              <View style={styles.entryHead}>
                <Text style={styles.entryTitle}>{entry.qualification || entry.institution}</Text>
                {entry.period ? <Text style={styles.entryPeriod}>{entry.period}</Text> : null}
              </View>
              {entry.qualification ? <Text style={styles.entrySub}>{entry.institution}</Text> : null}
              {entry.grade ? <Text style={styles.entrySub}>{entry.grade}</Text> : null}
              {entry.details ? <Text style={styles.entryBody}>{entry.details}</Text> : null}
            </View>
          ))}
        </Section>

        {cv.experience.length > 0 && (
          <Section title="Experience">
            {cv.experience.map((entry, i) => (
              <View key={`exp-${i}`} style={styles.entry}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>{entry.role}</Text>
                  {entry.period ? <Text style={styles.entryPeriod}>{entry.period}</Text> : null}
                </View>
                {entry.organisation ? <Text style={styles.entrySub}>{entry.organisation}</Text> : null}
                {entry.details ? <Text style={styles.entryBody}>{entry.details}</Text> : null}
              </View>
            ))}
          </Section>
        )}

        {cv.skills.length > 0 && (
          <Section title="Skills">
            <View style={styles.inlineList}>
              {cv.skills.map((skill, i) => (
                <Text key={`skill-${i}`} style={styles.chip}>
                  {skill.note ? `${skill.label} — ${skill.note}` : skill.label}
                </Text>
              ))}
            </View>
          </Section>
        )}

        {cv.languages.length > 0 && (
          <Section title="Languages">
            <View style={styles.inlineList}>
              {cv.languages.map((language, i) => (
                <Text key={`lang-${i}`} style={styles.chip}>
                  {language.note ? `${language.label} — ${language.note}` : language.label}
                </Text>
              ))}
            </View>
          </Section>
        )}

        {cv.activities.length > 0 && (
          <Section title="Activities and Leadership">
            {cv.activities.map((activity, i) => (
              <View key={`act-${i}`} style={styles.entry}>
                <Text style={styles.entryTitle}>{activity.label}</Text>
                {activity.note ? <Text style={styles.entrySub}>{activity.note}</Text> : null}
              </View>
            ))}
          </Section>
        )}

        {cv.referees.length > 0 && (
          <Section title="Referees">
            <View style={styles.refereeGrid}>
              {cv.referees.map((referee, i) => (
                <View key={`ref-${i}`} style={styles.referee}>
                  <Text style={styles.entryTitle}>{referee.name}</Text>
                  {referee.position ? <Text style={styles.entrySub}>{referee.position}</Text> : null}
                  {referee.organisation ? <Text style={styles.entrySub}>{referee.organisation}</Text> : null}
                  {referee.email ? <Text style={styles.entrySub}>{referee.email}</Text> : null}
                  {referee.phone ? <Text style={styles.entrySub}>{referee.phone}</Text> : null}
                </View>
              ))}
            </View>
          </Section>
        )}

        <View style={styles.footer} fixed>
          <Text>Prepared through the {associationName} members' portal</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
