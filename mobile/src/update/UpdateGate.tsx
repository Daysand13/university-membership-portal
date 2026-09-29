import { useEffect, useState, type ReactNode } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import type { ReleaseManifest, UpdateVerdict } from "../api/types";
import { checkForUpdate, downloadUpdate, installUpdate, UpdateError } from "./updater";
import { Button } from "../ui/components";
import { colours, radius, spacing, type } from "../theme";

/**
 * Offering an update, and occasionally insisting on one.
 *
 * Checked once on startup and never again in that session: a member
 * reading an article should not have a dialog thrown over it because a
 * release happened while they were reading.
 *
 * "Later" means later. The only case that cannot be dismissed is a release
 * the association has marked as the minimum — a security fix, or a change
 * that breaks the old app's requests — and even then the person is told
 * why rather than simply blocked.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const [verdict, setVerdict] = useState<UpdateVerdict | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    void checkForUpdate()
      .then(setVerdict)
      .catch(() => {
        // Offline at startup is the normal case in Winneba. The app opens.
      });
  }, []);

  if (!verdict || verdict.action === "none") return <>{children}</>;

  if (verdict.action === "unsupported-device") {
    // Said once, then out of the way: there is nothing they can do about
    // their phone's Android version, and nagging would be cruel.
    return <>{children}</>;
  }

  const required = verdict.action === "require";
  if (dismissed && !required) return <>{children}</>;

  const release: ReleaseManifest = verdict.release;

  const update = async () => {
    setProblem(null);
    setProgress(0);
    try {
      const file = await downloadUpdate(release, setProgress);
      await installUpdate(file);
    } catch (err) {
      setProgress(null);
      setProblem(
        err instanceof UpdateError
          ? err.message
          : "The update couldn't be downloaded. Check your connection and try again.",
      );
    }
  };

  const busy = progress !== null;

  return (
    <>
      {children}
      <Modal visible transparent animationType="fade" onRequestClose={() => !required && setDismissed(true)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} accessibilityViewIsModal accessibilityRole="alert">
            <Text accessibilityRole="header" style={styles.title}>
              {required ? "This version is no longer supported" : `ASSN ${release.version} is available`}
            </Text>

            <Text style={styles.body}>{required ? verdict.reason : release.changelog}</Text>

            {!required && <Text style={styles.muted}>{release.changelog ? "" : "Improvements and fixes."}</Text>}
            <Text style={styles.muted}>
              About {Math.max(1, Math.round(release.sizeBytes / (1024 * 1024)))} MB to download.
            </Text>

            {busy && (
              <Text style={styles.muted} accessibilityRole="progressbar" accessibilityLabel="Downloading the update">
                Downloading… {Math.round((progress ?? 0) * 100)}%
              </Text>
            )}

            {problem && (
              <Text accessibilityRole="alert" style={styles.problem}>
                {problem}
              </Text>
            )}

            <View style={styles.actions}>
              <Button label={problem ? "Try again" : "Update now"} onPress={update} busy={busy} />
              {!required && !busy && (
                <Button label="Later" variant="outline" onPress={() => setDismissed(true)} />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 21, 61, 0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colours.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: type.heading, fontWeight: "700", color: colours.primary, lineHeight: type.heading * 1.35 },
  body: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.6 },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
  problem: { fontSize: type.small, color: colours.danger, lineHeight: type.small * 1.5 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
