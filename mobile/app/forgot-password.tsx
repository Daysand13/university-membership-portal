import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { api, ApiError } from "../src/api/client";
import { Body, Button, Heading, Screen } from "../src/ui/components";
import { FormAlert, TextField } from "../src/ui/form";
import { Text } from "../src/ui/Text";
import { makeStyles } from "../src/a11y/preferences";

/**
 * Getting back into an account. The email is the website's own — the same
 * link, the same rules — and setting the new password happens there.
 * The answer is the same whether or not the address has an account.
 */

const useStyles = makeStyles((t) => ({
  done: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
}));

export default function ForgotPasswordScreen() {
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string[] | undefined>();
  const [done, setDone] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setProblem(null);
    setFieldError(undefined);
    try {
      const reply = await api.post<{ message: string }>("/auth/forgot", { email });
      setDone(reply.message);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.email) setFieldError(err.fieldErrors.email);
      else setProblem(err instanceof Error ? err.message : "That didn't go through. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Forgotten your password?</Heading>
        {done ? (
          <>
            <Text accessibilityRole="alert" style={styles.done}>
              {done}
            </Text>
            <Button label="Back to sign in" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <Body muted>Enter the email address on your account. We&apos;ll send a link to set a new password.</Body>
            <TextField
              label="Email address"
              value={email}
              onChange={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              inputMode="email"
              required
              error={fieldError}
            />
            <FormAlert message={problem} />
            <Button label="Send the link" busy={busy} disabled={email.trim().length === 0} onPress={() => void send()} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
