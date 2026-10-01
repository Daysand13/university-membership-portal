import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useApi } from "../src/data/useApi";
import type { DirectoryEntry } from "../src/api/types";
import { makeStyles, useTheme } from "../src/a11y/preferences";
import { Badge, Card, Empty, Loading, Problem, Screen } from "../src/ui/components";
import { TextField } from "../src/ui/form";
import { Text } from "../src/ui/Text";
import { spacing } from "../src/theme";

/**
 * Graduates who chose to be listed.
 *
 * No email addresses and no phone numbers — a directory a whole
 * association can open on a phone is one somebody will eventually export,
 * and what that should yield is names and professions. Getting in touch
 * goes through mentorship, which both sides have agreed to.
 */

const useStyles = makeStyles((t) => ({
  searchBox: { padding: spacing.lg, paddingBottom: 0 },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  name: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  role: { fontSize: t.type.body, color: t.colours.ink },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function DirectoryScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const { data, error, loading, refreshing, refresh } = useApi<{ alumni: DirectoryEntry[]; total: number }>(
    `/alumni${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
  );

  return (
    <Screen>
      <View style={styles.searchBox}>
        <TextField
          label="Search by name, programme or profession"
          value={query}
          onChange={setQuery}
          autoCapitalize="none"
          placeholder="teaching"
        />
      </View>

      {loading ? (
        <Loading what="the directory" />
      ) : error && !data ? (
        <Problem message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={data?.alumni ?? []}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colours.accentText} />}
          ListEmptyComponent={<Empty title="Nobody matches that" />}
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.programme} · Class of {item.graduationYear}
              </Text>
              {(item.currentPosition || item.profession) && (
                <Text style={styles.role}>
                  {[item.currentPosition ?? item.profession, item.currentOrganization].filter(Boolean).join(" at ")}
                </Text>
              )}
              {item.location && <Text style={styles.muted}>{item.location}</Text>}
              {item.willingToMentor && <Badge label="Open to mentoring" tone="good" />}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
