import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import * as Application from "expo-application";
import { useAuth } from "../../src/auth/AuthContext";
import { registerForPush, updatePushPreferences } from "../../src/push/register";
import { makeStyles } from "../../src/a11y/preferences";
import { DisplaySheet, SwitchRow } from "../../src/a11y/A11yControls";
import { Button, Card, Heading, Screen, SectionLabel } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { SITE_URL, ENVIRONMENT, IS_PRODUCTION } from "../../src/config";
import { spacing } from "../../src/theme";

/**
 * Settings, and the way out.
 *
 * Accessibility first: the display settings are in the header of every
 * screen, but somebody looking for them goes to "More", so they are here as
 * well. Notifications next, so somebody who finds the app noisy can turn it
 * down in two taps instead of uninstalling it.
 */

const useStyles = makeStyles((t) => ({
  cardTitle: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  footer: { paddingTop: spacing.lg, gap: spacing.xs },
  environment: { fontSize: t.type.tiny, fontWeight: "700", color: t.colours.warning },
}));

export default function MoreScreen() {
  const styles = useStyles();
  const { signOut, identity } = useAuth();
  const [displayOpen, setDisplayOpen] = useState(false);
  const [news, setNews] = useState(true);
  const [events, setEvents] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const [saving, setSaving] = useState(false);

  const change = async (next: { news?: boolean; events?: boolean; announcements?: boolean }) => {
    if (saving) return;
    setSaving(true);
    try {
      await registerForPush();
      await updatePushPreferences({ news, events, announcements, ...next });
    } catch {
      // Not worth an error screen — the switch shows what they asked for,
      // and the next change will try again.
    } finally {
      setSaving(false);
    }
  };

  const toggle = (set: (on: boolean) => void, key: "news" | "events" | "announcements") => (on: boolean) => {
    set(on);
    void change({ [key]: on });
  };

  return (
    <Screen scroll>
      <Heading>More</Heading>

      <SectionLabel>Accessibility</SectionLabel>
      <Card
        onPress={() => setDisplayOpen(true)}
        accessibilityLabel="Display settings. Text size, high contrast and dark mode."
      >
        <Text style={styles.cardTitle}>Display settings</Text>
        <Text style={styles.muted}>Text size, high contrast and dark mode.</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Read Aloud</Text>
        <Text style={styles.muted}>
          The speaker button at the top of every screen reads that screen to you — its words, its buttons and its
          boxes. Press it again to stop.
        </Text>
      </Card>
      <DisplaySheet open={displayOpen} onClose={() => setDisplayOpen(false)} />

      <SectionLabel>You</SectionLabel>
      <Card onPress={() => router.push("/profile")} accessibilityLabel="Your profile. Your record, and your contact details.">
        <Text style={styles.cardTitle}>Your profile</Text>
        <Text style={styles.muted}>Your record, and your contact details.</Text>
      </Card>
      {identity?.audience === "MEMBER" && (
        <>
          <Card onPress={() => router.push("/id-card")} accessibilityLabel="Your ID card. Kept on this phone, so it works with no signal.">
            <Text style={styles.cardTitle}>Your ID card</Text>
            <Text style={styles.muted}>Kept on this phone, so it works with no signal.</Text>
          </Card>
          <Card onPress={() => router.push("/support")} accessibilityLabel="Support. Ask for assistive technology, a note-taker, or welfare support.">
            <Text style={styles.cardTitle}>Support</Text>
            <Text style={styles.muted}>Ask for assistive technology, a note-taker, or welfare support.</Text>
          </Card>
          <Card onPress={() => router.push("/barrier-reports")} accessibilityLabel="Report a barrier. Anything on campus that stops you taking part.">
            <Text style={styles.cardTitle}>Report a barrier</Text>
            <Text style={styles.muted}>Anything on campus that stops you taking part.</Text>
          </Card>
        </>
      )}

      {identity?.audience === "PATRON" && (
        <Card onPress={() => router.push("/messages")} accessibilityLabel="Messages. Write to the association's executive.">
          <Text style={styles.cardTitle}>Messages</Text>
          <Text style={styles.muted}>Write to the association&apos;s executive.</Text>
        </Card>
      )}

      {(identity?.audience === "MEMBER" || identity?.audience === "ALUMNI") && (
        <>
          <SectionLabel>Opportunities</SectionLabel>
          <Card
            onPress={() => router.push("/opportunities")}
            accessibilityLabel="Opportunity board. Jobs, internships, scholarships and volunteering shared by graduates."
          >
            <Text style={styles.cardTitle}>Opportunity board</Text>
            <Text style={styles.muted}>Jobs, internships, scholarships and volunteering shared by graduates.</Text>
          </Card>
        </>
      )}

      {(identity?.audience === "MEMBER" || identity?.audience === "ALUMNI") && (
        <>
          <SectionLabel>Mentorship</SectionLabel>
          <Card
            onPress={() => router.push("/mentorship")}
            accessibilityLabel={
              identity.audience === "MEMBER"
                ? "Your mentors. Messages, sessions and calls."
                : "Your students. Messages, sessions and calls."
            }
          >
            <Text style={styles.cardTitle}>{identity.audience === "MEMBER" ? "Your mentors" : "Your students"}</Text>
            <Text style={styles.muted}>Messages, sessions and calls.</Text>
          </Card>
        </>
      )}

      <SectionLabel>Notifications on this phone</SectionLabel>
      <Card>
        <SwitchRow label="News" hint="When the association publishes an article." value={news} onChange={toggle(setNews, "news")} />
        <SwitchRow label="Events" hint="When an event is announced, or its date changes." value={events} onChange={toggle(setEvents, "events")} />
        <SwitchRow
          label="Announcements"
          hint="When the association sends you something."
          value={announcements}
          onChange={toggle(setAnnouncements, "announcements")}
        />
      </Card>

      <SectionLabel>Elsewhere</SectionLabel>
      <Card
        onPress={() => void Linking.openURL(SITE_URL)}
        accessibilityLabel="The website. Opens it in your browser, for enrolling, CVs, letters and paying online."
      >
        <Text style={styles.cardTitle}>The website</Text>
        <Text style={styles.muted}>Everything the app doesn&apos;t carry — writing a CV or a letter, and paying online.</Text>
      </Card>

      <SectionLabel>Your account</SectionLabel>
      <Text style={styles.muted}>Signed in as {identity?.name ?? "you"} · {identity?.label}</Text>
      <Button label="Sign out" variant="outline" onPress={() => void signOut()} />

      <View style={styles.footer}>
        <Text style={styles.muted}>
          ASSN {Application.nativeApplicationVersion ?? "1.0.0"} (build {Application.nativeBuildVersion ?? "?"})
        </Text>
        {/* A tester must never have to wonder which build they are holding. */}
        {!IS_PRODUCTION && (
          <Text style={styles.environment}>
            {ENVIRONMENT.toUpperCase()} BUILD · {SITE_URL}
          </Text>
        )}
      </View>
    </Screen>
  );
}
