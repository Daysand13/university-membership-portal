import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/data/useApi";
import type { NewsArticle } from "../../src/api/types";
import { makeStyles } from "../../src/a11y/preferences";
import { CoverImage, Loading, Problem, Screen } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";
import { readable } from "../../src/ui/html";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/** One article. The body arrives as HTML and is shown as plain words (src/ui/html.ts). */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.title, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.title * 1.3 },
  meta: { fontSize: t.type.small, color: t.colours.muted },
  excerpt: { fontSize: t.type.subheading, color: t.colours.ink, lineHeight: t.type.subheading * 1.5 },
  content: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.7 },
}));

export default function ArticleScreen() {
  const styles = useStyles();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, refresh } = useApi<{ article: NewsArticle }>(`/news/${slug}`, {
    cacheKey: `news-${slug}`,
  });

  if (loading) {
    return (
      <Screen>
        <Loading what="this article" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't find that article."} onRetry={refresh} />
      </Screen>
    );
  }

  const { article } = data;

  return (
    <Screen scroll>
      <CoverImage url={article.coverImageUrl} />
      <Text accessibilityRole="header" style={styles.title}>
        {article.title}
      </Text>
      <Text style={styles.meta}>
        {article.publishedAt ? dateFormat.format(new Date(article.publishedAt)) : ""}
        {article.author ? ` · ${article.author}` : ""}
      </Text>
      {article.excerpt && <Text style={styles.excerpt}>{article.excerpt}</Text>}
      <Text style={styles.content}>{readable(article.content)}</Text>
    </Screen>
  );
}
