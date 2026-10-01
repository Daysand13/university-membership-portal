import { FlatList, Linking, RefreshControl } from "react-native";
import { useApi } from "../src/data/useApi";
import type { LibraryDocument, Paged } from "../src/api/types";
import { makeStyles, useTheme } from "../src/a11y/preferences";
import { Card, Empty, Loading, OfflineNotice, Problem, Screen } from "../src/ui/components";
import { Text } from "../src/ui/Text";
import { spacing } from "../src/theme";

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

const useStyles = makeStyles((t) => ({
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.subheading * 1.4 },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.5 },
  muted: { fontSize: t.type.small, color: t.colours.muted },
}));

export default function LibraryScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { data, error, loading, refreshing, fromCache, refresh } = useApi<{ documents: LibraryDocument[] } & Paged>(
    "/library?pageSize=30",
    { cacheKey: "library" },
  );

  if (loading) {
    return (
      <Screen>
        <Loading what="the library" />
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
        data={data?.documents ?? []}
        keyExtractor={(doc) => doc.id}
        contentContainerStyle={styles.list}
        initialNumToRender={30}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colours.accentText} />}
        ListEmptyComponent={<Empty title="Nothing published yet" />}
        renderItem={({ item }) =>
          item.fileUrl ? (
            <Card
              onPress={() => void Linking.openURL(item.fileUrl as string)}
              accessibilityLabel={`${item.title}, ${sizeLabel(item.fileSize)}.`}
              accessibilityHint="Opens the document"
            >
              <Text style={styles.title}>{item.title}</Text>
              {item.description && <Text style={styles.body}>{item.description}</Text>}
              <Text style={styles.muted}>{[item.category, sizeLabel(item.fileSize), item.version].filter(Boolean).join(" · ")}</Text>
            </Card>
          ) : (
            <Card>
              <Text style={styles.title}>{item.title}</Text>
              {item.description && <Text style={styles.body}>{item.description}</Text>}
              <Text style={styles.muted}>This one isn&apos;t available to download.</Text>
            </Card>
          )
        }
      />
    </Screen>
  );
}
