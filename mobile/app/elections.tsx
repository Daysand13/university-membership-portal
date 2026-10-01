import { useApi } from "../src/data/useApi";
import type { ElectionView } from "../src/api/types";
import { makeStyles } from "../src/a11y/preferences";
import { Badge, Card, Empty, Heading, Loading, Problem, Screen } from "../src/ui/components";
import { Text } from "../src/ui/Text";
import { spacing } from "../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

/**
 * The election, to read.
 *
 * No ballot is cast here, and the screen says so rather than leaving
 * anybody hunting for a button that does not exist. Voting happens at a
 * polling terminal the Electoral Commission supervises, which is the whole
 * design of ASSN Ballot — a personal phone has none of that supervision.
 */

const useStyles = makeStyles((t) => ({
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.6 },
  name: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  position: { fontSize: t.type.body, color: t.colours.muted },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  notice: { fontSize: t.type.small, color: t.colours.ink, lineHeight: t.type.small * 1.5, marginTop: spacing.xs },
}));

export default function ElectionsScreen() {
  const styles = useStyles();
  const { data, error, loading, refresh } = useApi<ElectionView>("/elections", { cacheKey: "elections" });

  if (loading) {
    return (
      <Screen>
        <Loading what="the election" />
      </Screen>
    );
  }
  if (error && !data) {
    return (
      <Screen>
        <Problem message={error} onRetry={refresh} />
      </Screen>
    );
  }
  if (!data?.election) {
    return (
      <Screen>
        <Empty title="No election at the moment" description="When one is announced, it will appear here." />
      </Screen>
    );
  }

  const { election } = data;

  return (
    <Screen scroll>
      <Heading>{election.title}</Heading>
      {election.description && <Text style={styles.body}>{election.description}</Text>}

      <Card>
        <Badge label={election.phase.replace(/_/g, " ").toLowerCase()} />
        {election.votingOpensAt && (
          <Text style={styles.muted}>Voting opens {dateFormat.format(new Date(election.votingOpensAt))}</Text>
        )}
        {election.votingClosesAt && (
          <Text style={styles.muted}>Voting closes {dateFormat.format(new Date(election.votingClosesAt))}</Text>
        )}
        <Text style={styles.notice}>{data.votingNotice}</Text>
      </Card>

      <Heading level={2}>Candidates</Heading>
      {election.candidates.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Nobody has been approved to stand yet.</Text>
        </Card>
      ) : (
        election.candidates.map((candidate) => (
          <Card key={candidate.id}>
            <Text style={styles.name}>{candidate.name}</Text>
            <Text style={styles.position}>{candidate.position}</Text>
            {candidate.manifesto && <Text style={styles.body}>{candidate.manifesto}</Text>}
          </Card>
        ))
      )}

      {!election.resultsPublic && (
        <Text style={styles.muted}>Results appear here once the Electoral Commission publishes them.</Text>
      )}
    </Screen>
  );
}
