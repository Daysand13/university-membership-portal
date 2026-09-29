import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useApi } from "../src/data/useApi";
import { useAuth } from "../src/auth/AuthContext";
import type { Announcement } from "../src/api/types";
import { Card, Empty, Loading, Problem } from "../src/ui/components";
import { colours, spacing, type } from "../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

function readable(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * What the association has sent this person.
 *
 * Not cached: an announcement is addressed to somebody, and a shared phone
 * should not keep one person's post for the next person to find.
 */
export default function AnnouncementsScreen() {
  const { signedIn } = useAuth();
  const { data, error, loading, refreshing, refresh } = useApi<{ announcements: Announcement[] }>(
    "/announcements",
    { enabled: signedIn },
  );

  if (!signedIn) return <Empty title="Sign in to see your announcements" />;
  if (loading) return <Loading what="your announcements" />;
  if (error && !data) return <Problem message={error} onRetry={refresh} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={data?.announcements ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
        ListEmptyComponent={
          <Empty title="Nothing yet" description="Announcements the association sends you will appear here." />
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.meta}>
              {item.authorName}
              {item.sentAt ? ` · ${dateFormat.format(new Date(item.sentAt))}` : ""}
            </Text>
            <Text style={styles.body}>{readable(item.bodyHtml)}</Text>
            {item.attachmentName && <Text style={styles.meta}>Attached: {item.attachmentName}</Text>}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  subject: { fontSize: type.subheading, fontWeight: "700", color: colours.primary, lineHeight: type.subheading * 1.4 },
  meta: { fontSize: type.small, color: colours.slate },
  body: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.6 },
});
