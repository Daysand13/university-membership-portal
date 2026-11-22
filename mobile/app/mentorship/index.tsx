import { Linking } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import type { MentorshipList } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Body, Button, Card, Empty, Heading, Loading, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { SITE_URL } from "../../src/config";

const when = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const STATUS: Record<string, string> = {
  REQUESTED: "Waiting for an answer",
  ACTIVE: "Active",
  DECLINED: "Declined",
  ENDED: "Ended",
};

/**
 * A student's mentors, or a mentor's students. Nothing cached: it names
 * people and what they are talking about.
 */

const useStyles = makeStyles((t) => ({
  name: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function MentorshipListScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const allowed = identity?.audience === "MEMBER" || identity?.audience === "ALUMNI";
  const { data, error, loading, refresh } = useApi<MentorshipList>("/mentorship", { enabled: allowed });

  if (!allowed) {
    return (
      <Screen>
        <Empty title="Mentorship is for students and graduates" />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your mentorships" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your mentorships."} onRetry={refresh} />
      </Screen>
    );
  }

  const student = data.side === "student";
  return (
    <Screen scroll>
      <Heading>{student ? "Your mentors" : "Your students"}</Heading>

      {data.mentorships.length === 0 ? (
        <>
          <Empty
            title={student ? "No mentor yet" : "No students yet"}
            description={
              student
                ? "Asking a graduate to mentor you is done on the website, where you can read about each of them."
                : "When a student asks you to mentor them, it appears here."
            }
          />
          {student && (
            <Button
              label="Find a mentor on the website"
              variant="outline"
              onPress={() => void Linking.openURL(`${SITE_URL}/membership/dashboard/mentorship`)}
            />
          )}
        </>
      ) : (
        data.mentorships.map((item) => {
          const parts = [
            item.otherName,
            STATUS[item.status] ?? item.status,
            item.otherIsInCall ? "in a call now, waiting for you" : null,
            item.unread ? "new messages" : null,
            item.nextSession ? `next session ${when.format(new Date(item.nextSession.scheduledFor))}` : null,
          ].filter(Boolean);
          return (
            <Card
              key={item.id}
              onPress={() => router.push(`/mentorship/${item.id}`)}
              accessibilityLabel={parts.join(". ")}
              accessibilityHint="Opens the conversation."
            >
              <Text style={styles.name}>{item.otherName}</Text>
              {item.otherDetail ? <Text style={styles.muted}>{item.otherDetail}</Text> : null}
              <Badge label={STATUS[item.status] ?? item.status} tone={item.status === "ACTIVE" ? "good" : "neutral"} />
              {item.otherIsInCall && <Badge label="In a call now, waiting for you" tone="warn" />}
              {item.unread && <Badge label="New messages" tone="warn" />}
              {item.nextSession && (
                <Text style={styles.muted}>Next session: {when.format(new Date(item.nextSession.scheduledFor))}</Text>
              )}
            </Card>
          );
        })
      )}

      <Body muted>Booking sessions and asking for a new mentor are on the website for now.</Body>
    </Screen>
  );
}
