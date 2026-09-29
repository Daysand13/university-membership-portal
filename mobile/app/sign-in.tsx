import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { registerForPush } from "../src/push/register";
import type { Identity } from "../src/api/types";
import { Body, Button, Card, Heading } from "../src/ui/components";
import { colours, radius, spacing, TOUCH_TARGET, type } from "../src/theme";

/**
 * Signing in.
 *
 * One box for either an index number or an email address, because that is
 * what the website's own sign-in accepts and a student who has graduated
 * may reasonably reach for either.
 *
 * Somebody who is both a student and a graduate is asked which portal
 * rather than being put wherever we guessed.
 *
 * Notifications are asked for after this, not before: Android only asks
 * once, and a prompt before somebody has seen what the app is gets refused
 * for good.
 */
export default function SignInScreen() {
  const { signIn, endedMessage, clearEndedMessage } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [choices, setChoices] = useState<Identity[] | null>(null);

  const attempt = async (audience?: Identity["audience"]) => {
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

    // Signed in. Now is the moment the question makes sense.
    void registerForPush();

    // Back, not replace. This screen was pushed on top of the tabs, so the
    // portal is already underneath — replacing this route with one already
    // in the stack does nothing at all, which looked from the outside like
    // signing in had silently failed. The portal reads the auth context, so
    // it is already showing the signed-in view by the time we land on it.
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/portal");
  };

  if (choices) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Heading>Which portal?</Heading>
        <Body muted>You belong to more than one. Choose the one you want to open.</Body>

        {/* This screen used to render neither of these, so a second sign-in
            that failed — a portal the account turns out not to have, a
            connection that dropped — looked like the tap had done nothing. */}
        {problem && (
          <Text accessibilityRole="alert" style={styles.problem}>
            {problem}
          </Text>
        )}

        {choices.map((choice) => (
          <Card
            key={choice.audience}
            onPress={() => {
              if (busy) return;
              void attempt(choice.audience);
            }}
            accessibilityLabel={`Sign in to the ${choice.label} as ${choice.name}`}
          >
            <Text style={styles.choiceTitle}>{choice.label}</Text>
            <Text style={styles.muted}>{choice.name}</Text>
          </Card>
        ))}

        {busy && (
          <View style={styles.working} accessibilityRole="progressbar" accessibilityLabel="Signing you in">
            <ActivityIndicator size="small" color={colours.primary} />
            <Text style={styles.muted}>Signing you in…</Text>
          </View>
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
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Heading>Sign in</Heading>

        {endedMessage && (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>{endedMessage}</Text>
          </View>
        )}

        <View>
          <Text nativeID="identifier-label" style={styles.label}>
            Index number or email address
          </Text>
          <TextInput
            accessibilityLabelledBy="identifier-label"
            accessibilityLabel="Index number or email address"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            inputMode="email"
            style={styles.input}
            placeholder="220010345 or you@example.com"
            placeholderTextColor={colours.slateLight}
          />
        </View>

        <View>
          <Text nativeID="password-label" style={styles.label}>
            Password
          </Text>
          <TextInput
            accessibilityLabelledBy="password-label"
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            style={styles.input}
          />
        </View>

        {problem && (
          <Text accessibilityRole="alert" style={styles.problem}>
            {problem}
          </Text>
        )}

        <Button
          label="Sign in"
          busy={busy}
          disabled={identifier.trim().length === 0 || password.length === 0}
          onPress={() => void attempt()}
        />

        <Text style={styles.muted}>
          Forgotten your password? Reset it on the association&apos;s website, then sign in here.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  label: { fontSize: type.small, fontWeight: "700", color: colours.primary, marginBottom: spacing.xs },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1.5,
    borderColor: colours.line,
    borderRadius: radius.md,
    backgroundColor: colours.surface,
    paddingHorizontal: spacing.lg,
    fontSize: type.body,
    color: colours.ink,
  },
  problem: { fontSize: type.body, color: colours.danger, lineHeight: type.body * 1.5 },
  notice: {
    backgroundColor: colours.warningLight,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noticeText: { fontSize: type.small, color: colours.ink, lineHeight: type.small * 1.5 },
  working: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  choiceTitle: { fontSize: type.subheading, fontWeight: "700", color: colours.primary },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
});
