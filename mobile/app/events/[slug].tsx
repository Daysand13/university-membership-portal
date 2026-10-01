import { Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { EventDetail } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { Badge, Button, CoverImage, Loading, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.title, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.title * 1.3 },
  when: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.ink },
  where: { fontSize: t.type.body, color: t.colours.muted },
  description: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.7 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function EventScreen() {
  const styles = useStyles();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, refresh } = useApi<{ event: EventDetail }>(`/events/${slug}`, {
    cacheKey: `event-${slug}`,
  });

  if (loading) {
    return (
      <Screen>
        <Loading what="this event" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't find that event."} onRetry={refresh} />
      </Screen>
    );
  }

  const { event } = data;
  const starts = new Date(event.startDate);
  const ends = new Date(event.endDate);
  const sameDay = starts.toDateString() === ends.toDateString();

  return (
    <Screen scroll>
      <CoverImage url={event.imageUrl} />
      {event.isPast && <Badge label="This event has passed" />}
      <Text accessibilityRole="header" style={styles.title}>
        {event.title}
      </Text>
      <Text style={styles.when}>
        {dateFormat.format(starts)}
        {!sameDay && ` — ${dateFormat.format(ends)}`}
      </Text>
      <Text style={styles.where}>{event.venue}</Text>
      <Text style={styles.description}>{event.description}</Text>
      {event.contactInfo && <Text style={styles.muted}>Contact: {event.contactInfo}</Text>}
      {event.registrationUrl && !event.isPast && (
        <Button label="Register for this event" onPress={() => void Linking.openURL(event.registrationUrl as string)} />
      )}
    </Screen>
  );
}
