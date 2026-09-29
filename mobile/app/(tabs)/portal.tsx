import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";
import { Badge, Button, Card, Heading, Loading, SectionLabel } from "../../src/ui/components";
import { colours, spacing, type } from "../../src/theme";

/**
 * Somebody's own corner of the association.
 *
 * Signed out it explains what signing in gets you rather than simply
 * refusing. Signed in it is a short list of the things people actually
 * come back for, and it differs by portal — a graduate has no dues.
 */

export default function PortalScreen() {
  const { ready, signedIn, identity, me, signOut } = useAuth();

  if (!ready) return <Loading what="your details" />;

  if (!signedIn) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Heading>Your portal</Heading>
        <Card>
          <Text style={styles.paragraph}>
            Sign in to see announcements meant for you, your membership details, your dues, and the alumni
            directory.
          </Text>
          <Text style={styles.muted}>
            Use the same index number or email address and password you use on the website.
          </Text>
          <View style={styles.action}>
            <Button label="Sign in" onPress={() => router.push("/sign-in")} />
          </View>
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Not a member yet?</Text>
          <Text style={styles.muted}>
            Joining is done on the website, where the enrollment form can take your documents.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const isMember = identity?.audience === "MEMBER";
  const isAlumni = identity?.audience === "ALUMNI";

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Heading>{identity?.name ?? "Your portal"}</Heading>
      <Badge label={identity?.label ?? ""} />

      {me?.audience === "MEMBER" && (
        <Card>
          <Text style={styles.cardTitle}>Membership</Text>
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
          {me.profile.organization && <Text style={styles.muted}>{me.profile.organization}</Text>}
        </Card>
      )}

      <SectionLabel>Shortcuts</SectionLabel>

      <Card onPress={() => router.push("/announcements")} accessibilityLabel="Announcements. Opens the list.">
        <Text style={styles.cardTitle}>Announcements</Text>
        <Text style={styles.muted}>What the association has sent you.</Text>
      </Card>

      {isMember && (
        <Card onPress={() => router.push("/dues")} accessibilityLabel="Dues. Opens what you owe and what you have paid.">
          <Text style={styles.cardTitle}>Dues</Text>
          <Text style={styles.muted}>What you owe this year, and what you have paid.</Text>
        </Card>
      )}

      {(isMember || isAlumni) && (
        <Card onPress={() => router.push("/directory")} accessibilityLabel="Alumni directory. Opens the list.">
          <Text style={styles.cardTitle}>Alumni directory</Text>
          <Text style={styles.muted}>Graduates who chose to be listed.</Text>
        </Card>
      )}

      <View style={styles.action}>
        <Button label="Sign out" onPress={signOut} variant="outline" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  cardTitle: { fontSize: type.subheading, fontWeight: "700", color: colours.primary },
  paragraph: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.5 },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
  action: { marginTop: spacing.sm },
});
