import { FlatList, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useApi } from "../src/data/useApi";
import type { LibraryDocument, Paged } from "../src/api/types";
import { Card, Empty, Loading, OfflineNotice, Problem } from "../src/ui/components";
import { colours, spacing, type } from "../src/theme";

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The association's public documents.
 *
 * The file is not pulled onto the phone — tapping hands its address to
 * Android, which opens it in whatever reads PDFs there. Downloading every
 * document to a phone with little storage would be the wrong favour.
 */
export default function LibraryScreen() {
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<
    { documents: LibraryDocument[] } & Paged
  >("/library?pageSize=30", { cacheKey: "library" });

  if (loading) return <Loading what="the library" />;
  if (error && !data) return <Problem message={error} onRetry={refresh} />;

  return (
    <View style={styles.screen}>
      {fromCache && <OfflineNotice />}
      <FlatList
        data={data?.documents ?? []}
        keyExtractor={(doc) => doc.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
        ListEmptyComponent={<Empty title="Nothing published yet" />}
        renderItem={({ item }) => (
          <Card
            onPress={item.fileUrl ? () => Linking.openURL(item.fileUrl as string) : undefined}
            accessibilityLabel={
              item.fileUrl ? `${item.title}, ${sizeLabel(item.fileSize)}. Opens the document.` : item.title
            }
          >
            <Text style={styles.title}>{item.title}</Text>
            {item.description && <Text style={styles.body}>{item.description}</Text>}
            <Text style={styles.muted}>
              {[item.category, sizeLabel(item.fileSize), item.version].filter(Boolean).join(" · ")}
            </Text>
            {!item.fileUrl && <Text style={styles.muted}>This one isn&apos;t available to download.</Text>}
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
  body: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.5 },
  muted: { fontSize: type.small, color: colours.slate },
});
