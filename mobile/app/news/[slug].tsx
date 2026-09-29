import { ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { NewsArticle } from "../../src/api/types";
import { Loading, Problem } from "../../src/ui/components";
import { colours, spacing, type } from "../../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * One article.
 *
 * The body arrives as HTML from a rich text editor. Rather than render it
 * with a web view — heavy, and a way for markup to misbehave — the tags
 * are stripped and the words kept. Plain text reads better aloud anyway,
 * which is how several members will meet it.
 */
function readable(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, refresh } = useApi<{ article: NewsArticle }>(`/news/${slug}`, {
    cacheKey: `news-${slug}`,
  });

  if (loading) return <Loading what="this article" />;
  if (error || !data) return <Problem message={error ?? "We couldn't find that article."} onRetry={refresh} />;

  const { article } = data;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text accessibilityRole="header" style={styles.title}>
        {article.title}
      </Text>
      <Text style={styles.meta}>
        {article.publishedAt ? dateFormat.format(new Date(article.publishedAt)) : ""}
        {article.author ? ` · ${article.author}` : ""}
      </Text>
      {article.excerpt && <Text style={styles.excerpt}>{article.excerpt}</Text>}
      <Text style={styles.content}>{readable(article.content)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: type.title, fontWeight: "700", color: colours.primary, lineHeight: type.title * 1.3 },
  meta: { fontSize: type.small, color: colours.slate },
  excerpt: { fontSize: type.subheading, color: colours.ink, lineHeight: type.subheading * 1.5 },
  content: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.7 },
});
