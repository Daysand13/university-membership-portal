import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { EventDetail } from "../../src/api/types";
import { Badge, Button, Loading, Problem } from "../../src/ui/components";
import { colours, spacing, type } from "../../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export default function EventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, refresh } = useApi<{ event: EventDetail }>(`/events/${slug}`, {
    cacheKey: `event-${slug}`,
  });

  if (loading) return <Loading what="this event" />;
  if (error || !data) return <Problem message={error ?? "We couldn't find that event."} onRetry={refresh} />;

  const { event } = data;
  const starts = new Date(event.startDate);
  const ends = new Date(event.endDate);
  const sameDay = starts.toDateString() === ends.toDateString();

  return (
    <ScrollView contentContainerStyle={styles.body}>
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
        <Button
          label="Register for this event"
          onPress={() => Linking.openURL(event.registrationUrl as string)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: type.title, fontWeight: "700", color: colours.primary, lineHeight: type.title * 1.3 },
  when: { fontSize: type.subheading, fontWeight: "700", color: colours.ink },
  where: { fontSize: type.body, color: colours.slate },
  description: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.7 },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
});
