import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useApi } from "../src/data/useApi";
import type { ElectionView } from "../src/api/types";
import { Badge, Card, Empty, Heading, Loading, Problem } from "../src/ui/components";
import { colours, spacing, type } from "../src/theme";

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
export default function ElectionsScreen() {
  const { data, error, loading, refresh } = useApi<ElectionView>("/elections", { cacheKey: "elections" });

  if (loading) return <Loading what="the election" />;
  if (error && !data) return <Problem message={error} onRetry={refresh} />;
  if (!data?.election) {
    return <Empty title="No election at the moment" description="When one is announced, it will appear here." />;
  }

  const { election } = data;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Heading>{election.title}</Heading>
      {election.description && <Text style={styles.body_}>{election.description}</Text>}

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
            {candidate.manifesto && <Text style={styles.body_}>{candidate.manifesto}</Text>}
          </Card>
        ))
      )}

      {!election.resultsPublic && (
        <View>
          <Text style={styles.muted}>
            Results appear here once the Electoral Commission publishes them.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  body_: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.6 },
  name: { fontSize: type.subheading, fontWeight: "700", color: colours.primary },
  position: { fontSize: type.body, color: colours.slate },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
  notice: { fontSize: type.small, color: colours.ink, lineHeight: type.small * 1.5, marginTop: spacing.xs },
});
