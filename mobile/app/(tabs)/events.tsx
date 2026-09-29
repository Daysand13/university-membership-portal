import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { EventSummary, Paged } from "../../src/api/types";
import { Card, Empty, Loading, OfflineNotice, Problem } from "../../src/ui/components";
import { colours, radius, spacing, TOUCH_TARGET, type } from "../../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export default function EventsScreen() {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<{ events: EventSummary[] } & Paged>(
    `/events?when=${when}&pageSize=20`,
    { cacheKey: `events-${when}` },
  );

  const events = data?.events ?? [];

  return (
    <View style={styles.screen}>
      {fromCache && <OfflineNotice />}

      {/* Two plain choices rather than a segmented control, so each is a
          button a screen reader announces with its state. */}
      <View style={styles.switcher} accessibilityRole="tablist">
        {(["upcoming", "past"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setWhen(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected: when === option }}
            accessibilityLabel={option === "upcoming" ? "Upcoming events" : "Past events"}
            style={[styles.switch, when === option && styles.switchOn]}
          >
            <Text style={[styles.switchText, when === option && styles.switchTextOn]}>
              {option === "upcoming" ? "Upcoming" : "Past"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Loading what="events" />
      ) : error && !data ? (
        <Problem message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
          ListEmptyComponent={
            <Empty
              title={when === "upcoming" ? "Nothing coming up" : "No past events"}
              description={when === "upcoming" ? "Events the association announces will appear here." : undefined}
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push(`/events/${item.slug}`)}
              accessibilityLabel={`${item.title}, ${dateFormat.format(new Date(item.startDate))}, at ${item.venue}. Opens the full event.`}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>{dateFormat.format(new Date(item.startDate))}</Text>
              <Text style={styles.meta}>{item.venue}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  switcher: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 },
  switch: {
    minHeight: TOUCH_TARGET,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colours.line,
    backgroundColor: colours.surface,
  },
  switchOn: { backgroundColor: colours.primary, borderColor: colours.primary },
  switchText: { fontSize: type.body, fontWeight: "700", color: colours.slate },
  switchTextOn: { color: colours.white },
  title: { fontSize: type.subheading, fontWeight: "700", color: colours.primary, lineHeight: type.subheading * 1.4 },
  date: { fontSize: type.body, color: colours.ink },
  meta: { fontSize: type.small, color: colours.slate },
});
