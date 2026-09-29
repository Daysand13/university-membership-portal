import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { NewsSummary, Paged } from "../../src/api/types";
import { Badge, Card, CoverImage, Empty, Loading, OfflineNotice, Problem } from "../../src/ui/components";
import { colours, spacing, type } from "../../src/theme";

/**
 * The association's news, which is what most people open the app for.
 *
 * Open without signing in, exactly as the website's news page is.
 */

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

function when(iso: string | null): string {
  if (!iso) return "Not yet published";
  return dateFormat.format(new Date(iso));
}

export default function NewsScreen() {
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<{ news: NewsSummary[] } & Paged>(
    "/news?pageSize=20",
    { cacheKey: "news" },
  );

  if (loading) return <Loading what="the news" />;
  if (error && !data) return <Problem message={error} onRetry={refresh} />;

  const articles = data?.news ?? [];

  return (
    <View style={styles.screen}>
      {fromCache && <OfflineNotice />}
      <FlatList
        data={articles}
        keyExtractor={(article) => article.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
        ListEmptyComponent={
          <Empty title="No news yet" description="Anything the association publishes will appear here." />
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/news/${item.slug}`)}
            accessibilityLabel={`${item.title}. ${when(item.publishedAt)}. Opens the full article.`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: type.subheading, fontWeight: "700", color: colours.primary, lineHeight: type.subheading * 1.4 },
  excerpt: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.5 },
  meta: { fontSize: type.small, color: colours.slate },
});
