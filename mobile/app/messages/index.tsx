import { router } from "expo-router";
import { useApi, useRefreshOnReturn } from "../../src/data/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import type { PatronThreads } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Empty, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";

const when = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" });

/** A patron's conversations with the association's executive. */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function PatronMessagesScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isPatron = identity?.audience === "PATRON";
  const { data, error, loading, refresh } = useApi<PatronThreads>("/patron-messages", { enabled: isPatron });
  useRefreshOnReturn(refresh);

  if (!isPatron) {
    return (
      <Screen>
        <Empty title="Messages to the executive are for patrons" />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your messages" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your messages."} onRetry={refresh} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Heading>Messages</Heading>
      <Body muted>Write to the whole executive, or one of its officers. Replies come here and by email.</Body>
      <Button label="Write to the executive" onPress={() => router.push("/messages/new")} />

      {data.threads.length === 0 ? (
        <Empty title="No conversations yet" />
      ) : (
        data.threads.map((t) => {
          const spoken = [
            t.subject,
            `to ${t.addressedTo}`,
            t.unread ? "new reply" : null,
            t.status === "CLOSED" ? "closed" : null,
            `last message ${when.format(new Date(t.lastMessageAt))}`,
          ]
            .filter(Boolean)
            .join(". ");
          return (
            <Card key={t.id} onPress={() => router.push(`/messages/${t.id}`)} accessibilityLabel={spoken} accessibilityHint="Opens the conversation.">
              <Text style={styles.title}>{t.subject}</Text>
              <Text style={styles.muted}>
                To {t.addressedTo} · {when.format(new Date(t.lastMessageAt))}
              </Text>
              {t.unread && <Badge label="New reply" tone="warn" />}
              {t.status === "CLOSED" && <Badge label="Closed" />}
              {t.lastMessage && (
                <Text style={styles.muted} numberOfLines={2}>
                  {t.lastMessage.fromYou ? "You: " : "Executive team: "}
                  {t.lastMessage.body}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
