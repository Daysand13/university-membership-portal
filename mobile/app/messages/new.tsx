import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { PatronThreads } from "../../src/api/types";
import { Button, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { FormAlert, SelectField, TextField } from "../../src/ui/form";

/** A patron starting a conversation with the executive, or one officer on it. */
export default function NewPatronMessageScreen() {
  const { data, error, loading, refresh } = useApi<PatronThreads>("/patron-messages");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (loading) {
    return (
      <Screen>
        <Loading what="the form" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load the form."} onRetry={refresh} />
      </Screen>
    );
  }

  const send = async () => {
    setBusy(true);
    setProblem(null);
    setFieldErrors({});
    try {
      const reply = await api.post<{ id: string }>("/patron-messages", { addressedTo: to, subject, body });
      router.replace(`/messages/${reply.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setProblem(err instanceof Error ? err.message : "Your message couldn't be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Write to the executive</Heading>
        <SelectField label="To" value={to} options={data.contacts} onChange={setTo} required error={fieldErrors.addressedTo} />
        <TextField label="Subject" value={subject} onChange={setSubject} required maxLength={150} error={fieldErrors.subject} />
        <TextField label="Your message" value={body} onChange={setBody} multiline required maxLength={5000} error={fieldErrors.body} />
        <FormAlert message={problem} />
        <Button
          label="Send"
          busy={busy}
          disabled={!to || subject.trim().length === 0 || body.trim().length === 0}
          onPress={() => void send()}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
