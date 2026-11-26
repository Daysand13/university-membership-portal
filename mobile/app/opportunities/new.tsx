import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { OpportunityBoard } from "../../src/api/types";
import { Body, Button, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { DateField, FormAlert, SelectField, TextField } from "../../src/ui/form";

/**
 * A graduate posting an opening. The website's form, field for field; it
 * goes to the association for approval before anybody sees it.
 */
export default function NewOpportunityScreen() {
  const { data, error, loading, refresh } = useApi<OpportunityBoard>("/opportunities");
  const [form, setForm] = useState({
    title: "",
    organization: "",
    type: "",
    location: "",
    description: "",
    applyUrl: "",
    applyEmail: "",
    closingDate: "",
  });
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

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const year = new Date().getFullYear();

  const send = async () => {
    setBusy(true);
    setProblem(null);
    setFieldErrors({});
    try {
      await api.post("/opportunities", form);
      router.back();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setProblem(err instanceof Error ? err.message : "Your opening couldn't be posted. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Post an opening</Heading>
        <Body muted>The association checks each opening before it goes on the board, usually within a few days.</Body>

        <TextField label="Title" value={form.title} onChange={set("title")} required maxLength={200} error={fieldErrors.title} />
        <TextField label="Organisation" value={form.organization} onChange={set("organization")} required maxLength={200} error={fieldErrors.organization} />
        <SelectField label="What kind of opportunity?" value={form.type} options={data.types} onChange={set("type")} required error={fieldErrors.type} />
        <TextField label="Where (optional)" value={form.location} onChange={set("location")} maxLength={200} error={fieldErrors.location} />
        <TextField
          label="Describe it"
          hint="The role, who it suits, and anything that makes it accessible."
          value={form.description}
          onChange={set("description")}
          multiline
          required
          maxLength={5000}
          error={fieldErrors.description}
        />
        <TextField
          label="Link to apply"
          hint="A link, an email address, or both."
          value={form.applyUrl}
          onChange={set("applyUrl")}
          autoCapitalize="none"
          inputMode="url"
          maxLength={500}
          error={fieldErrors.applyUrl}
        />
        <TextField
          label="Email to apply to"
          value={form.applyEmail}
          onChange={set("applyEmail")}
          autoCapitalize="none"
          inputMode="email"
          maxLength={254}
          error={fieldErrors.applyEmail}
        />
        <DateField label="Closing date (optional)" value={form.closingDate} onChange={set("closingDate")} fromYear={year} toYear={year + 2} error={fieldErrors.closingDate} />

        <FormAlert message={problem} />
        <Button label="Send for approval" busy={busy} onPress={() => void send()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
