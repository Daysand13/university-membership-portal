import { useState } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useApi, useRefreshOnReturn } from "../../src/data/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { api } from "../../src/api/client";
import type { Opportunity, OpportunityBoard } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Empty, Heading, Loading, Problem, Screen, SectionLabel } from "../../src/ui/components";
import { FormAlert, SelectField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * The opportunity board: jobs, internships, scholarships and volunteering
 * posted by graduates and approved by the association. Students and
 * graduates read it; a graduate can post an opening and follow it through
 * review.
 */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.45 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

function Listing({ o, styles }: { o: Opportunity; styles: ReturnType<typeof useStyles> }) {
  return (
    <>
      <Text style={styles.title}>{o.title}</Text>
      <Text style={styles.muted}>
        {o.typeLabel} · {o.organization}
        {o.location ? ` · ${o.location}` : ""}
      </Text>
      {o.closingDate && <Text style={styles.muted}>Closes {dateFormat.format(new Date(o.closingDate))}</Text>}
      <Text style={styles.body}>{o.description}</Text>
      <Text style={styles.muted}>Posted by {o.postedBy}</Text>
    </>
  );
}

export default function OpportunitiesScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const allowed = identity?.audience === "MEMBER" || identity?.audience === "ALUMNI";
  const { data, error, loading, refresh } = useApi<OpportunityBoard>("/opportunities", { enabled: allowed });
  useRefreshOnReturn(refresh);
  const [type, setType] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!allowed) {
    return (
      <Screen>
        <Empty title="The opportunity board is for students and graduates" />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="the opportunity board" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load the board."} onRetry={refresh} />
      </Screen>
    );
  }

  const shown = type ? data.opportunities.filter((o) => o.type === type) : data.opportunities;

  const withdraw = async (id: string) => {
    setBusy(id);
    setProblem(null);
    try {
      await api.post(`/opportunities/${id}/withdraw`);
      await refresh();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That opening couldn't be withdrawn.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Heading>Opportunities</Heading>
      <Body muted>Openings graduates have shared, checked by the association.</Body>
      {data.canPost && <Button label="Post an opening" onPress={() => router.push("/opportunities/new")} />}
      <FormAlert message={problem} />

      <SelectField
        label="Show"
        value={type}
        options={[{ value: "", label: "Everything" }, ...data.types]}
        onChange={setType}
      />

      {shown.length === 0 ? (
        <Empty title="Nothing open right now" description="New openings appear here as soon as they're approved." />
      ) : (
        shown.map((o) => (
          <Card key={o.id}>
            <Listing o={o} styles={styles} />
            {o.applyUrl && (
              <Button
                label="Apply on their website"
                accessibilityHint="Opens the application page in your browser."
                onPress={() => void Linking.openURL(o.applyUrl!)}
              />
            )}
            {o.applyEmail && (
              <Button
                label={`Apply by email to ${o.applyEmail}`}
                variant={o.applyUrl ? "outline" : "primary"}
                onPress={() => void Linking.openURL(`mailto:${o.applyEmail}?subject=${encodeURIComponent(o.title)}`)}
              />
            )}
          </Card>
        ))
      )}

      {data.canPost && data.mine.length > 0 && (
        <>
          <SectionLabel>Openings you&apos;ve posted</SectionLabel>
          {data.mine.map((o) => (
            <Card key={o.id}>
              <Text style={styles.title}>{o.title}</Text>
              <Badge label={o.statusLabel} tone={o.status === "APPROVED" ? "good" : o.status === "REJECTED" ? "warn" : "neutral"} />
              {o.reviewNote && <Text style={styles.body}>From the association: {o.reviewNote}</Text>}
              {o.canWithdraw && (
                <Button label="Withdraw this opening" variant="outline" busy={busy === o.id} onPress={() => void withdraw(o.id)} />
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
