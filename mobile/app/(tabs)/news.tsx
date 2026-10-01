import { FlatList, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { NewsSummary, Paged } from "../../src/api/types";
import { makeStyles, useTheme } from "../../src/a11y/preferences";
import { Badge, Card, CoverImage, Empty, Loading, OfflineNotice, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { spacing } from "../../src/theme";

/**
 * The association's news, newest first.
 *
 * The server puts the newest first for the app (the website's news page
 * pins featured articles instead) — see listPublishedNews.
 */

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

function when(iso: string | null): string {
  if (!iso) return "Not yet published";
  return dateFormat.format(new Date(iso));
}

const useStyles = makeStyles((t) => ({
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.subheading * 1.4 },
  excerpt: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
  meta: { fontSize: t.type.small, color: t.colours.muted },
}));

export default function NewsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<{ news: NewsSummary[] } & Paged>(
    "/news?pageSize=20",
    { cacheKey: "news" },
  );

  // Inside Screen even while loading or failed: an error is exactly what
  // somebody using Read Aloud needs read to them.
  if (loading) {
    return (
      <Screen>
        <Loading what="the news" />
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
      {fromCache && <OfflineNotice />}
      <FlatList
        data={data?.news ?? []}
        keyExtractor={(article) => article.id}
        contentContainerStyle={styles.list}
        // Twenty is all there are; render them all so Read Aloud can read
        // the whole list, not just what fitted on the first screen.
        initialNumToRender={20}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colours.accentText} />}
        ListEmptyComponent={<Empty title="No news yet" description="Anything the association publishes will appear here." />}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/news/${item.slug}`)}
            accessibilityLabel={`${item.title}. ${when(item.publishedAt)}.${item.featured ? " Featured." : ""}`}
            accessibilityHint="Opens the full article"
          >
            <CoverImage url={item.coverImageUrl} />
            {item.featured && <Badge label="Featured" tone="warn" />}
            <Text style={styles.title}>{item.title}</Text>
            {item.excerpt && (
              <Text style={styles.excerpt} numberOfLines={3}>
                {item.excerpt}
              </Text>
            )}
            <Text style={styles.meta}>
              {when(item.publishedAt)}
              {item.category ? ` · ${item.category}` : ""}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
