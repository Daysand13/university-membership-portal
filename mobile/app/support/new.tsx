import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { SupportList } from "../../src/api/types";
import { Body, Button, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { DateField, FormAlert, RadioGroup, TextField } from "../../src/ui/form";

/**
 * Asking the association for support. The website's form, field for field:
 * what is needed, the details, an amount for welfare, and an optional date
 * it is needed by. What was typed stays if the server sends it back.
 */
export default function NewSupportRequestScreen() {
  const { data, error, loading, refresh } = useApi<SupportList>("/support");
  const [type, setType] = useState("ASSISTIVE_TECH");
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [neededBy, setNeededBy] = useState("");
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

  const chosen = data.types.find((t) => t.value === type);
  const year = new Date().getFullYear();

  const send = async () => {
    setBusy(true);
    setProblem(null);
    setFieldErrors({});
    try {
      await api.post("/support", { type, details, amount: chosen?.needsAmount ? amount : "", neededBy });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setProblem(err instanceof Error ? err.message : "Your request couldn't be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Ask for support</Heading>
        <Body muted>The executives read every request and reply by email.</Body>

        <RadioGroup
          label="What do you need?"
          value={type}
          onChange={setType}
          required
          options={data.types.map((t) => ({ value: t.value, label: t.label, hint: t.description }))}
          error={fieldErrors.type}
        />
        <TextField
          label="Tell us more"
          hint={type === "NOTE_TAKER" ? "Which course, which lectures, and what would help most." : "What you need and what it's for."}
          value={details}
          onChange={setDetails}
          multiline
          required
          maxLength={3000}
          error={fieldErrors.details}
        />
        {chosen?.needsAmount && (
          <TextField
            label="How much do you need, in cedis?"
            value={amount}
            onChange={setAmount}
            keyboardType="decimal-pad"
            required
            error={fieldErrors.amount}
          />
        )}
        <DateField label="Needed by (optional)" value={neededBy} onChange={setNeededBy} fromYear={year} toYear={year + 1} error={fieldErrors.neededBy} />

        <FormAlert message={problem} />
        <Button label="Send request" busy={busy} disabled={details.trim().length === 0} onPress={() => void send()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
