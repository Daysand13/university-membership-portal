import { router } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Card, Heading, Loading, Screen, SectionLabel } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";

/**
 * The member's dashboard — what they signed in for.
 *
 * Who they are and their record first, then the things people come back
 * for. It differs by portal: a graduate has no dues, a patron no directory.
 * News and events are the tabs beside this, not a section of it.
 */

const useStyles = makeStyles((t) => ({
  cardTitle: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  paragraph: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

function firstName(name: string | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export default function HomeScreen() {
  const styles = useStyles();
  const { identity, me } = useAuth();

  if (!identity) {
    return (
      <Screen>
        <Loading what="your details" />
      </Screen>
    );
  }

  const isMember = identity.audience === "MEMBER";
  const isAlumni = identity.audience === "ALUMNI";

  const shortcut = (title: string, text: string, href: string) => (
    <Card key={href} onPress={() => router.push(href as never)} accessibilityLabel={`${title}. ${text}`}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.muted}>{text}</Text>
    </Card>
  );

  return (
    <Screen scroll>
      <Heading>{firstName(identity.name) ? `Hello, ${firstName(identity.name)}` : "Your portal"}</Heading>
      <Badge label={identity.label} />

      {me?.audience === "MEMBER" && (
        <Card>
          <Text style={styles.cardTitle}>Your membership</Text>
          <Text style={styles.paragraph}>{me.profile.programme}</Text>
          <Text style={styles.muted}>
            {me.profile.level} · {me.profile.campus}
          </Text>
          <Text style={styles.muted}>Index number {me.profile.indexNumber}</Text>
        </Card>
      )}

      {me?.audience === "ALUMNI" && (
        <Card>
          <Text style={styles.cardTitle}>Your record</Text>
          <Text style={styles.paragraph}>{me.profile.programme}</Text>
          <Text style={styles.muted}>Class of {me.profile.graduationYear}</Text>
        </Card>
      )}

      {me?.audience === "PATRON" && (
        <Card>
          <Text style={styles.cardTitle}>Patron</Text>
          <Text style={styles.paragraph}>{me.profile.occupation}</Text>
          {me.profile.organization ? <Text style={styles.muted}>{me.profile.organization}</Text> : null}
        </Card>
      )}

      <SectionLabel>Shortcuts</SectionLabel>
      {shortcut("Announcements", "What the association has sent you.", "/announcements")}
      {isMember && shortcut("Dues", "What you owe this year, and what you have paid.", "/dues")}
      {(isMember || isAlumni) && shortcut("Alumni directory", "Graduates who chose to be listed.", "/directory")}
      {shortcut("Library", "Documents the association has published.", "/library")}
      {shortcut("Elections", "Who is standing, and results once they are published.", "/elections")}
    </Screen>
  );
}
