import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { api, ApiError } from "../../src/api/client";
import type { MentorshipDetail } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Heading, Loading, Problem, Screen, SectionLabel } from "../../src/ui/components";
import { FormAlert, TextField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";
import { SITE_URL } from "../../src/config";
import { spacing } from "../../src/theme";

const when = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

/**
 * One mentorship: the conversation, the sessions, the calls.
 *
 * Messages read as a list in order, each saying who wrote it and when, so
 * TalkBack reads a conversation rather than a scatter of bubbles. Calls
 * open on the website, where the meeting runs — with voice only as an
 * option and nothing recorded — and the other side is told you're calling.
 */

const useStyles = makeStyles((t) => ({
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  who: { fontSize: t.type.small, fontWeight: "700", color: t.colours.muted },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
  mine: { borderLeftWidth: 4, borderLeftColor: t.colours.button },
  theirs: { borderLeftWidth: 4, borderLeftColor: t.colours.lineStrong },
  callBox: { gap: spacing.sm },
}));

export default function MentorshipScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refresh } = useApi<MentorshipDetail>(`/mentorship/${id}`);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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

  const active = data.status === "ACTIVE";
  const firstName = data.otherName.split(" ")[0];
  const upcoming = data.sessions.filter((s) => s.status === "SCHEDULED");

  const send = async () => {
    if (sending) return;
    setSending(true);
    setProblem(null);
    setFieldError(undefined);
    setSent(null);
    try {
      await api.post(`/mentorship/${id}/messages`, { body: draft });
      setDraft("");
      setSent(`Sent to ${firstName}.`);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.body) setFieldError(err.fieldErrors.body);
      else setProblem(err instanceof Error ? err.message : "Your message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>{data.otherName}</Heading>
        {data.goals ? <Body muted>Working on: {data.goals}</Body> : null}

        {active && (
          <Card>
            <View style={styles.callBox}>
              {data.otherIsInCall ? (
                <Text accessibilityRole="alert" style={styles.body}>
                  {data.otherName} is in a call now, waiting for you.
                </Text>
              ) : (
                <Text style={styles.muted}>
                  Voice or video, at any time, for as long as you like. {firstName} is told you&apos;re calling. Nothing is
                  recorded.
                </Text>
              )}
              <Button
                label={data.otherIsInCall ? "Join the call" : `Call ${firstName}`}
                accessibilityHint="Opens the call on the association's website, in your browser."
                onPress={() => void Linking.openURL(`${SITE_URL}${data.callPath}`)}
              />
            </View>
          </Card>
        )}

        <SectionLabel>Conversation</SectionLabel>
        {data.messages.length === 0 ? (
          <Body muted>No messages yet. Say hello — {firstName} will get an email that you&apos;ve written.</Body>
        ) : (
          data.messages.map((message) => {
            const who = message.mine ? "You" : firstName;
            const at = when.format(new Date(message.createdAt));
            return (
              <Card key={message.id} style={message.mine ? styles.mine : styles.theirs} accessibilityLabel={`${who}, ${at}: ${message.body}`}>
                <Text style={styles.who}>
                  {who} · {at}
                </Text>
                <Text style={styles.body}>{message.body}</Text>
              </Card>
            );
          })
        )}

        {active ? (
          <>
            <TextField
              label="Your message"
              value={draft}
              onChange={setDraft}
              multiline
              maxLength={5000}
              error={fieldError}
            />
            <FormAlert message={problem} />
            {sent && (
              <Text accessibilityLiveRegion="polite" style={styles.muted}>
                {sent}
              </Text>
            )}
            <Button label="Send" busy={sending} disabled={draft.trim().length === 0} onPress={() => void send()} />
          </>
        ) : (
          <Body muted>This mentorship has ended, so the conversation is closed.</Body>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionLabel>Booked sessions</SectionLabel>
            {upcoming.map((session) => (
              <Card key={session.id}>
                <Text style={styles.body}>{when.format(new Date(session.scheduledFor))}</Text>
                {session.topic ? <Text style={styles.muted}>{session.topic}</Text> : null}
              </Card>
            ))}
          </>
        )}

        {data.calls.length > 0 && (
          <>
            <SectionLabel>Recent calls</SectionLabel>
            {data.calls.map((call) => (
              <Text key={call.id} style={styles.muted}>
                {when.format(new Date(call.startedAt))} · {call.mine ? "You called" : `${firstName} called`} ·{" "}
                {call.withVideo ? "video" : "voice"} · {call.live ? "going on now" : call.length}
              </Text>
            ))}
            {data.calls.some((c) => c.live) && <Badge label="A call is going on" tone="warn" />}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
