import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { PatronThread } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { FormAlert, TextField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";

const when = new Intl.DateTimeFormat("en-GH", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });

/**
 * One conversation with the executive. Messages in order, each saying who
 * wrote it and when; a reply to a closed conversation opens it again, as
 * on the website.
 */

const useStyles = makeStyles((t) => ({
  who: { fontSize: t.type.small, fontWeight: "700", color: t.colours.muted },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
  mine: { borderLeftWidth: 4, borderLeftColor: t.colours.button },
  theirs: { borderLeftWidth: 4, borderLeftColor: t.colours.lineStrong },
  muted: { fontSize: t.type.small, color: t.colours.muted },
}));

export default function PatronThreadScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useApi<PatronThread>(`/patron-messages/${id}`);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string[] | undefined>();
  const [sent, setSent] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen>
        <Loading what="the conversation" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load this conversation."} onRetry={refresh} />
      </Screen>
    );
  }

  const reply = async () => {
    setBusy(true);
    setProblem(null);
    setFieldError(undefined);
    setSent(null);
    try {
      await api.post(`/patron-messages/${id}`, { body: draft });
      setDraft("");
      setSent("Sent to the executive.");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.body) setFieldError(err.fieldErrors.body);
      else setProblem(err instanceof Error ? err.message : "Your reply couldn't be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>{data.subject}</Heading>
        <Body muted>To {data.addressedTo}</Body>
        {data.status === "CLOSED" && <Badge label="Closed - replying opens it again" />}

        {data.messages.map((m) => (
          <Card key={m.id} style={m.fromYou ? styles.mine : styles.theirs}>
            <Text style={styles.who}>
              {m.from} · {when.format(new Date(m.createdAt))}
            </Text>
            <Text style={styles.body}>{m.body}</Text>
          </Card>
        ))}

        <TextField label="Your reply" value={draft} onChange={setDraft} multiline maxLength={5000} error={fieldError} />
        <FormAlert message={problem} />
        {sent && (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {sent}
          </Text>
        )}
        <Button label="Send reply" busy={busy} disabled={draft.trim().length === 0} onPress={() => void reply()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
