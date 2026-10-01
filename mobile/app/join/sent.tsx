import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "../../src/a11y/preferences";
import { Button, Card, Heading, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { spacing } from "../../src/theme";

/**
 * After an application that waits for review — a student's or a patron's.
 *
 * Says what happens next and that there is nothing else to do, which is the
 * question somebody has at this point. The website says the same.
 */

const useStyles = makeStyles((t) => ({
  hero: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xl },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colours.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.6 },
  strong: { fontWeight: "700" },
}));

export default function SentScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { kind, email } = useLocalSearchParams<{ kind?: string; email?: string }>();
  const patron = kind === "patron";

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.tick}>
          <Ionicons name="checkmark" size={40} color={theme.colours.success} accessibilityElementsHidden importantForAccessibility="no" />
        </View>
        <Heading>{patron ? "Thank you — your application has been received" : "Application sent"}</Heading>
      </View>

      <Card>
        {patron ? (
          <Text style={styles.body}>
            The association will review it and email you as soon as a decision has been made. Once you&apos;re approved,
            sign in here with your email address and the password you chose.
          </Text>
        ) : (
          <Text style={styles.body}>
            Thank you for applying. We&apos;ve emailed you a confirmation, and your application is now with the
            membership team. You&apos;ll get another email as soon as a decision has been made — there&apos;s nothing
            more you need to do right now.
          </Text>
        )}
        {email ? (
          <Text style={styles.body}>
            The emails go to <Text style={styles.strong}>{email}</Text>.
          </Text>
        ) : null}
      </Card>

      <Button label="Back to the start" onPress={() => router.replace("/welcome")} />
    </Screen>
  );
}
