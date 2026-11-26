import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { BarrierReportList } from "../../src/api/types";
import { AttachProblem, attachDocument, attachFromCamera, attachFromPhotos, type Attached } from "../../src/join/attach";
import { formatBytes } from "../../src/join/shrink";
import { Body, Button, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { DateField, FileField, FormAlert, SelectField, TextField } from "../../src/ui/form";
import { spacing } from "../../src/theme";

/**
 * Reporting a barrier. The website's form: a title, what happened, what
 * it's about, where and when - and up to three pieces of evidence, a photo
 * from the camera or the phone, or a PDF or voice note. Each is uploaded as
 * it is attached, so sending the report itself is quick.
 */
export default function NewBarrierReportScreen() {
  const { data, error, loading, refresh } = useApi<BarrierReportList>("/barrier-reports");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [evidence, setEvidence] = useState<Attached[]>([]);
  const [attaching, setAttaching] = useState<string | null>(null);
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

  const year = new Date().getFullYear();
  const full = evidence.length >= data.maxEvidence;

  const add = async (pick: () => Promise<Attached | null>) => {
    setFieldErrors(({ evidence: _drop, ...rest }) => rest);
    setAttaching("Uploading…");
    try {
      const attached = await pick();
      if (attached) setEvidence((list) => [...list, attached]);
    } catch (err) {
      setFieldErrors((e) => ({ ...e, evidence: [err instanceof AttachProblem ? err.message : "That file couldn't be attached."] }));
    } finally {
      setAttaching(null);
    }
  };

  const send = async () => {
    setBusy(true);
    setProblem(null);
    setFieldErrors({});
    try {
      await api.post("/barrier-reports", {
        title,
        description,
        category,
        location,
        occurredOn,
        evidence: evidence.filter((e) => e.token).map((e) => ({ token: e.token, name: e.name })),
      });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setProblem(err instanceof Error ? err.message : "Your report couldn't be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const status = attaching
    ? attaching
    : evidence.length
      ? `Attached: ${evidence.map((e) => `${e.name} (${formatBytes(e.bytes)})`).join(", ")}`
      : "";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Report a barrier</Heading>
        <Body muted>Only the association&apos;s executives see your report and anything you attach.</Body>

        <TextField label="A short title" value={title} onChange={setTitle} required maxLength={200} error={fieldErrors.title} hint="For example: Ramp at the library is blocked" />
        <SelectField
          label="What is it about?"
          value={category}
          options={data.categories}
          onChange={setCategory}
          required
          error={fieldErrors.category}
        />
        <TextField
          label="What happened?"
          value={description}
          onChange={setDescription}
          multiline
          required
          maxLength={5000}
          error={fieldErrors.description}
        />
        <TextField label="Where (optional)" value={location} onChange={setLocation} maxLength={200} error={fieldErrors.location} />
        <DateField label="When it happened (optional)" value={occurredOn} onChange={setOccurredOn} fromYear={year - 2} toYear={year} error={fieldErrors.occurredOn} />

        <FileField
          label={`Evidence (optional, up to ${data.maxEvidence})`}
          hint="A photo, a PDF, or a voice note describing it."
          status={status}
          error={fieldErrors.evidence}
          actions={
            <View style={{ gap: spacing.sm }}>
              <Button label="Take a photo" variant="outline" disabled={full || !!attaching} onPress={() => void add(() => attachFromCamera("evidence"))} />
              <Button label="Choose a photo" variant="outline" disabled={full || !!attaching} onPress={() => void add(() => attachFromPhotos("evidence"))} />
              <Button label="Choose a PDF or voice note" variant="outline" disabled={full || !!attaching} onPress={() => void add(() => attachDocument("evidence"))} />
              {evidence.length > 0 && (
                <Button label="Remove the attachments" variant="outline" disabled={!!attaching} onPress={() => setEvidence([])} />
              )}
            </View>
          }
        />

        <FormAlert message={problem} />
        <Button
          label="Send report"
          busy={busy}
          disabled={!!attaching || title.trim().length === 0 || description.trim().length === 0 || !category}
          onPress={() => void send()}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
