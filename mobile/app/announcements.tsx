import { FlatList, RefreshControl } from "react-native";
import { useApi } from "../src/data/useApi";
import type { Announcement } from "../src/api/types";
import { makeStyles, useTheme } from "../src/a11y/preferences";
import { Card, Empty, Loading, Problem, Screen } from "../src/ui/components";
import { Text } from "../src/ui/Text";
import { readable } from "../src/ui/html";
import { spacing } from "../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * What the association has sent this person.
 *
 * Not cached: an announcement is addressed to somebody, and a shared phone
 * should not keep one person's post for the next person to find.
 */

const useStyles = makeStyles((t) => ({
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  subject: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.subheading * 1.4 },
  meta: { fontSize: t.type.small, color: t.colours.muted },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.6 },
}));

export default function AnnouncementsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { data, error, loading, refreshing, refresh } = useApi<{ announcements: Announcement[] }>("/announcements");

  if (loading) {
    return (
      <Screen>
        <Loading what="your announcements" />
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

  return (
    <Screen>
      <FlatList
        data={data?.announcements ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colours.accentText} />}
        ListEmptyComponent={<Empty title="Nothing yet" description="Announcements the association sends you will appear here." />}
        renderItem={({ item }) => (
          <Card>
            <Text accessibilityRole="header" style={styles.subject}>
              {item.subject}
            </Text>
            <Text style={styles.meta}>
              {item.authorName}
              {item.sentAt ? ` · ${dateFormat.format(new Date(item.sentAt))}` : ""}
            </Text>
            <Text style={styles.body}>{readable(item.bodyHtml)}</Text>
            {item.attachmentName && <Text style={styles.meta}>Attached: {item.attachmentName}</Text>}
          </Card>
        )}
      />
    </Screen>
  );
}
