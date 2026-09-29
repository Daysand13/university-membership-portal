import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useApi } from "../src/data/useApi";
import { useAuth } from "../src/auth/AuthContext";
import type { DirectoryEntry } from "../src/api/types";
import { Badge, Card, Empty, Loading, Problem } from "../src/ui/components";
import { colours, radius, spacing, TOUCH_TARGET, type } from "../src/theme";

/**
 * Graduates who chose to be listed.
 *
 * No email addresses and no phone numbers — a directory a whole
 * association can open on a phone is one somebody will eventually export,
 * and what that should yield is names and professions. Getting in touch
 * goes through mentorship, which both sides have agreed to.
 */
export default function DirectoryScreen() {
  const { signedIn } = useAuth();
  const [query, setQuery] = useState("");
  const { data, error, loading, refreshing, refresh } = useApi<{ alumni: DirectoryEntry[]; total: number }>(
    `/alumni${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
    { enabled: signedIn },
  );

  if (!signedIn) return <Empty title="Sign in to see the directory" />;

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <Text nativeID="directory-search" style={styles.label}>
          Search by name, programme or profession
        </Text>
        <TextInput
          accessibilityLabelledBy="directory-search"
          accessibilityLabel="Search the alumni directory"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={styles.input}
          placeholder="e.g. teaching"
          placeholderTextColor={colours.slateLight}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  searchBox: { padding: spacing.lg, paddingBottom: 0 },
  label: { fontSize: type.small, fontWeight: "700", color: colours.primary, marginBottom: spacing.xs },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1.5,
    borderColor: colours.line,
    borderRadius: radius.md,
    backgroundColor: colours.surface,
    paddingHorizontal: spacing.lg,
    fontSize: type.body,
    color: colours.ink,
  },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  name: { fontSize: type.subheading, fontWeight: "700", color: colours.primary },
  role: { fontSize: type.body, color: colours.ink },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
});
