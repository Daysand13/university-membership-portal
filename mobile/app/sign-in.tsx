import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { registerForPush } from "../src/push/register";
import type { Identity } from "../src/api/types";
import { makeStyles } from "../src/a11y/preferences";
import { Body, Button, Card, Heading, Screen } from "../src/ui/components";
import { FormAlert, TextField } from "../src/ui/form";
import { Text } from "../src/ui/Text";
import { radius, spacing } from "../src/theme";

/**
 * Signing in.
 *
 * One box for either an index number or an email address, because that is
 * what the website's own sign-in accepts and a student who has graduated
 * may reasonably reach for either. Somebody who is both a student and a
 * graduate is asked which portal rather than being put wherever we guessed.
 *
 * This screen does not navigate anywhere when sign-in succeeds. The root
 * layout guards the signed-in half of the app, and the router moves there
 * by itself the moment a session exists — one place deciding, rather than
 * every screen that can sign somebody in getting the navigation right.
 *
 * Notifications are asked for after this, not before: Android only asks
 * once, and a prompt before somebody has seen what the app is gets refused
 * for good.
 */

const useStyles = makeStyles((t) => ({
  notice: {
    backgroundColor: t.colours.warningBg,
    borderRadius: radius.md,
    borderWidth: t.border,
    borderColor: t.colours.warning,
    padding: spacing.lg,
  },
  noticeText: { fontSize: t.type.small, color: t.colours.warning, lineHeight: t.type.small * 1.5, fontWeight: "600" },
  choiceTitle: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  working: { fontSize: t.type.body, color: t.colours.ink },
}));

export default function SignInScreen() {
  const styles = useStyles();
  const { signIn, endedMessage, clearEndedMessage } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [choices, setChoices] = useState<Identity[] | null>(null);

  const attempt = async (audience?: Identity["audience"]) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    clearEndedMessage();

    const result = await signIn(identifier.trim(), password, audience);
    setBusy(false);

    if (result.kind === "choose") {
      setChoices(result.identities);
      return;
    }
    if (result.kind === "failed") {
      setProblem(result.message);
      return;
    }

    // Signed in. Now is the moment the question makes sense. The router has
    // already been told; nothing to navigate here.
    void registerForPush();
  };

  if (choices) {
    return (
      <Screen scroll>
        <Heading>Which portal?</Heading>
        <Body muted>You belong to more than one. Choose the one you want to open.</Body>

        <FormAlert message={problem} />

        {choices.map((choice) => (
          <Card
            key={choice.audience}
            onPress={() => void attempt(choice.audience)}
            accessibilityLabel={`Open the ${choice.label} as ${choice.name}`}
          >
            <Text style={styles.choiceTitle}>{choice.label}</Text>
            <Text style={styles.muted}>{choice.name}</Text>
          </Card>
        ))}

        {busy && (
          <Text accessibilityLiveRegion="polite" style={styles.working}>
            Signing you in…
          </Text>
        )}

        <Button
          label="Back"
          variant="outline"
          disabled={busy}
          onPress={() => {
            setProblem(null);
            setChoices(null);
          }}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Sign in</Heading>

        {endedMessage && (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.noticeText}>
              {endedMessage}
            </Text>
          </View>
        )}

        <TextField
          label="Index number or email address"
          value={identifier}
          onChange={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          inputMode="email"
          placeholder="220010345 or you@example.com"
          required
        />

        <TextField
          label="Password"
          value={password}
          onChange={setPassword}
          secret
          autoCapitalize="none"
          autoComplete="current-password"
          required
        />

        <FormAlert message={problem} />

        <Button
          label="Sign in"
          busy={busy}
          disabled={identifier.trim().length === 0 || password.length === 0}
          onPress={() => void attempt()}
        />

        <Body muted>Forgotten your password? Reset it on the association&apos;s website, then sign in here.</Body>

        <Button label="Not a member yet? Join" variant="outline" onPress={() => router.push("/join")} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
