import { useState } from "react";
import { router } from "expo-router";
import { useApi, useRefreshOnReturn } from "../../src/data/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { api } from "../../src/api/client";
import type { SupportList } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Button, Card, Empty, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { FormAlert } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * A student's requests for support, newest first, with where each stands
 * and what the executives said. One still waiting to be looked at can be
 * withdrawn.
 */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.45 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function SupportListScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const { data, error, loading, refresh } = useApi<SupportList>("/support", { enabled: isMember });
  useRefreshOnReturn(refresh);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!isMember) {
    return (
      <Screen>
        <Empty title="Support requests are for students" />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your requests" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your requests."} onRetry={refresh} />
      </Screen>
    );
  }

  const withdraw = async (id: string) => {
    setBusy(id);
    setProblem(null);
    try {
      await api.post(`/support/${id}/withdraw`);
      await refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That request couldn't be withdrawn.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Heading>Support</Heading>
      <Button label="Ask for support" onPress={() => router.push("/support/new")} />
      <FormAlert message={problem} />

      {data.requests.length === 0 ? (
        <Empty
          title="No requests yet"
          description="Ask for assistive technology, a note-taker, or welfare support, and the executives will reply by email."
        />
      ) : (
        data.requests.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{r.typeLabel}</Text>
            <Badge label={r.statusLabel} tone={r.status === "APPROVED" || r.status === "FULFILLED" ? "good" : "neutral"} />
            <Text style={styles.body}>{r.details}</Text>
            <Text style={styles.muted}>
              Sent {dateFormat.format(new Date(r.createdAt))}
              {r.amountRequested ? ` · asked for ${r.amountRequested}` : ""}
              {r.neededBy ? ` · needed by ${dateFormat.format(new Date(r.neededBy))}` : ""}
            </Text>
            {r.approvedAmount && <Text style={styles.body}>Approved: {r.approvedAmount}</Text>}
            {r.reviewNote && <Text style={styles.body}>From the executives: {r.reviewNote}</Text>}
            {r.canWithdraw && (
              <Button
                label="Withdraw this request"
                variant="outline"
                busy={busy === r.id}
                accessibilityHint="Takes the request back. It hasn't been looked at yet."
                onPress={() => void withdraw(r.id)}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
