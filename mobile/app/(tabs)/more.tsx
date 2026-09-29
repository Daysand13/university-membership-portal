import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as Application from "expo-application";
import { useAuth } from "../../src/auth/AuthContext";
import { registerForPush, updatePushPreferences } from "../../src/push/register";
import { Card, Heading, SectionLabel } from "../../src/ui/components";
import { SITE_URL, ENVIRONMENT, IS_PRODUCTION } from "../../src/config";
import { colours, spacing, type } from "../../src/theme";

/**
 * The rest of the association, and this phone's own settings.
 *
 * Notification preferences live here rather than buried: somebody who
 * finds the app noisy should be able to turn it down in two taps instead
 * of uninstalling it.
 */

export default function MoreScreen() {
  const { signedIn } = useAuth();
  const [news, setNews] = useState(true);
  const [events, setEvents] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const [saving, setSaving] = useState(false);

  const change = async (next: { news?: boolean; events?: boolean; announcements?: boolean }) => {
    if (!signedIn) return;
    setSaving(true);
    try {
      await registerForPush();
      await updatePushPreferences({ news, events, announcements, ...next });
    } catch {
      // Not worth an error screen — the switch reflects what they asked
      // for and the next change will try again.
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Heading>More</Heading>

      <SectionLabel>The association</SectionLabel>

      <Card onPress={() => router.push("/library")} accessibilityLabel="Library. Opens the association's documents.">
        <Text style={styles.cardTitle}>Library</Text>
        <Text style={styles.muted}>Documents the association has published.</Text>
      </Card>

      <Card onPress={() => router.push("/elections")} accessibilityLabel="Elections. Opens candidates and results.">
        <Text style={styles.cardTitle}>Elections</Text>
        <Text style={styles.muted}>Who is standing, and results once published.</Text>
      </Card>

      {signedIn && <SectionLabel>This phone</SectionLabel>}

      {signedIn && (
        <Card>
          <Text style={styles.cardTitle}>Notifications</Text>
          <Text style={styles.muted}>Choose what this phone is told about.</Text>
          {(
            [
              ["News", news, setNews, "news"],
              ["Events", events, setEvents, "events"],
              ["Announcements", announcements, setAnnouncements, "announcements"],
            ] as const
          ).map(([label, value, set, key]) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={value}
                disabled={saving}
                accessibilityLabel={`Notify me about ${label.toLowerCase()}`}
                onValueChange={(next) => {
                  set(next);
                  void change({ [key]: next });
                }}
                trackColor={{ true: colours.primaryMid, false: colours.line }}
              />
            </View>
          ))}
        </Card>
      )}

      <SectionLabel>Elsewhere</SectionLabel>

      <Card
        onPress={() => Linking.openURL(SITE_URL)}
        accessibilityLabel="Open the association's website in your browser."
      >
        <Text style={styles.cardTitle}>The website</Text>
        <Text style={styles.muted}>
          Everything the app doesn&apos;t carry — enrolling, writing a CV or a letter, and paying online.
        </Text>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.muted}>
          ASSN {Application.nativeApplicationVersion ?? "1.0.0"} (build {Application.nativeBuildVersion ?? "?"})
        </Text>
        {/* A tester must never have to wonder which build they are holding. */}
        {!IS_PRODUCTION && <Text style={styles.environment}>{ENVIRONMENT.toUpperCase()} BUILD · {SITE_URL}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  cardTitle: { fontSize: type.subheading, fontWeight: "700", color: colours.primary },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  switchLabel: { fontSize: type.body, color: colours.ink, flexShrink: 1 },
  footer: { paddingTop: spacing.lg, gap: spacing.xs },
  environment: { fontSize: type.tiny, fontWeight: "700", color: colours.warning },
});
