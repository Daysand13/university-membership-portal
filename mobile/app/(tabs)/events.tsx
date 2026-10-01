import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { EventSummary, Paged } from "../../src/api/types";
import { makeStyles, useTheme } from "../../src/a11y/preferences";
import { useSpeakable } from "../../src/a11y/reading";
import { describeControl } from "../../src/a11y/speech-words";
import { Card, CoverImage, Empty, Loading, OfflineNotice, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { radius, spacing, TOUCH_TARGET } from "../../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Accra",
});

const useStyles = makeStyles((t) => ({
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  switcher: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 },
  switch: {
    minHeight: TOUCH_TARGET,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: t.highContrast ? 2.5 : 1.5,
    borderColor: t.colours.lineStrong,
    backgroundColor: t.colours.surface,
  },
  switchOn: { backgroundColor: t.colours.button, borderColor: t.colours.button },
  switchText: { fontSize: t.type.body, fontWeight: "700", color: t.colours.ink },
  switchTextOn: { color: t.colours.onButton },
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.subheading * 1.4 },
  date: { fontSize: t.type.body, color: t.colours.ink },
  meta: { fontSize: t.type.small, color: t.colours.muted },
}));

type When = "upcoming" | "past";

/** Two plain choices rather than a segmented control: each is a tab TalkBack announces with its state. */
function WhenTab({ option, chosen, onChoose }: { option: When; chosen: boolean; onChoose: () => void }) {
  const styles = useStyles();
  const label = option === "upcoming" ? "Upcoming events" : "Past events";
  const ref = useSpeakable<React.ComponentRef<typeof View>>(describeControl({ kind: "radio", name: label, checked: chosen }));
  return (
    <Pressable
      ref={ref}
      onPress={onChoose}
      accessibilityRole="tab"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={label}
      style={[styles.switch, chosen && styles.switchOn]}
    >
      <Text speak={false} style={[styles.switchText, chosen && styles.switchTextOn]}>
        {option === "upcoming" ? "Upcoming" : "Past"}
      </Text>
    </Pressable>
  );
}

export default function EventsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const [when, setWhen] = useState<When>("upcoming");
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<{ events: EventSummary[] } & Paged>(
    `/events?when=${when}&pageSize=20`,
    { cacheKey: `events-${when}` },
  );

  return (
    <Screen>
      {fromCache && <OfflineNotice />}

      <View style={styles.switcher} accessibilityRole="tablist">
        {(["upcoming", "past"] as const).map((option) => (
          <WhenTab key={option} option={option} chosen={when === option} onChoose={() => setWhen(option)} />
        ))}
      </View>

      {loading ? (
        <Loading what="events" />
      ) : error && !data ? (
        <Problem message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={data?.events ?? []}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colours.accentText} />}
          ListEmptyComponent={
            <Empty
              title={when === "upcoming" ? "Nothing coming up" : "No past events"}
              description={when === "upcoming" ? "Events the association announces will appear here." : undefined}
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push(`/events/${item.slug}`)}
              accessibilityLabel={`${item.title}. ${dateFormat.format(new Date(item.startDate))}, at ${item.venue}.`}
              accessibilityHint="Opens the full event"
            >
              <CoverImage url={item.imageUrl} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>{dateFormat.format(new Date(item.startDate))}</Text>
              <Text style={styles.meta}>{item.venue}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
