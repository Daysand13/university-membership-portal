import { Image, View } from "react-native";
import { router } from "expo-router";
import { makeStyles } from "../src/a11y/preferences";
import { Button, Screen } from "../src/ui/components";
import { Text } from "../src/ui/Text";
import { radius, spacing } from "../src/theme";

/**
 * The first thing anybody sees: sign in, or join.
 *
 * Nothing else. News and events are for members now, behind the sign-in,
 * so this screen does not dangle them; it says what the association is in
 * one line and offers the two ways in. The two buttons are full width and
 * tall, because for some members this is the screen they will find hardest.
 */

const useStyles = makeStyles((t) => ({
  hero: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  badge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: t.border,
    borderColor: t.colours.line,
    ...t.shadow.card,
  },
  logo: { width: 112, height: 112 },
  title: {
    fontSize: t.type.title,
    lineHeight: t.type.title * 1.3,
    fontWeight: "700",
    color: t.colours.heading,
    textAlign: "center",
  },
  lede: {
    fontSize: t.type.body,
    lineHeight: t.type.body * 1.6,
    color: t.colours.ink,
    textAlign: "center",
  },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  card: {
    backgroundColor: t.colours.surface,
    borderRadius: radius.lg,
    borderWidth: t.border,
    borderColor: t.colours.line,
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  cardTitle: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function WelcomeScreen() {
  const styles = useStyles();

  return (
    <Screen scroll>
      <View style={styles.hero}>
        {/* White behind the badge in every mode: it is drawn for white, and
            its black script vanishes on the dark background otherwise. */}
        <View style={styles.badge}>
          <Image
            source={require("../assets/association-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="The badge of the Association of Students with Special Needs"
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Association of Students with Special Needs
        </Text>
        <Text style={styles.lede}>University of Education, Winneba. Sign in, or join us.</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Sign in" onPress={() => router.push("/sign-in")} />
        <Button label="Join the association" variant="outline" onPress={() => router.push("/join")} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Already a member on the website?</Text>
        <Text style={styles.muted}>
          Sign in with the same index number or email address and password you use there. Nothing new to set up.
        </Text>
      </View>
    </Screen>
  );
}
