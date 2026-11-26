import { useState } from "react";
import { router } from "expo-router";
import { useApi, useRefreshOnReturn } from "../../src/data/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { api } from "../../src/api/client";
import type { BarrierReportList } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Empty, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { FormAlert } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * A student's reports of barriers on campus - a blocked ramp, an
 * inaccessible exam, a lecturer refusing an adjustment - and where each
 * stands. One nobody has picked up yet can be withdrawn.
 */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.45 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function BarrierReportsScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const { data, error, loading, refresh } = useApi<BarrierReportList>("/barrier-reports", { enabled: isMember });
  useRefreshOnReturn(refresh);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!isMember) {
    return (
      <Screen>
        <Empty title="Reporting barriers is for students" />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your reports" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your reports."} onRetry={refresh} />
      </Screen>
    );
  }

  const withdraw = async (id: string) => {
    setBusy(id);
    setProblem(null);
    try {
      await api.post(`/barrier-reports/${id}/withdraw`);
      await refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That report couldn't be withdrawn.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Heading>Barriers you&apos;ve reported</Heading>
      <Body muted>Anything on campus that stops you taking part. The association follows each one up and tells you what happens.</Body>
      <Button label="Report a barrier" onPress={() => router.push("/barrier-reports/new")} />
      <FormAlert message={problem} />

      {data.reports.length === 0 ? (
        <Empty title="No reports yet" />
      ) : (
        data.reports.map((r) => (
          <Card key={r.id}>
            <Text style={styles.title}>{r.title}</Text>
            <Badge label={r.statusLabel} tone={r.status === "RESOLVED" ? "good" : r.status === "SUBMITTED" ? "neutral" : "warn"} />
            <Text style={styles.muted}>
              {r.categoryLabel}
              {r.location ? ` · ${r.location}` : ""} · reported {dateFormat.format(new Date(r.createdAt))}
              {r.attachments ? ` · ${r.attachments} attached` : ""}
            </Text>
            <Text style={styles.body}>{r.description}</Text>
            {r.resolutionNote && <Text style={styles.body}>What was done: {r.resolutionNote}</Text>}
            {r.canWithdraw && (
              <Button
                label="Withdraw this report"
                variant="outline"
                busy={busy === r.id}
                accessibilityHint="Takes the report back. Nobody has picked it up yet."
                onPress={() => void withdraw(r.id)}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
