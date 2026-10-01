import { useEffect, useState, type ReactNode } from "react";
import { Modal, View } from "react-native";
import type { ReleaseManifest, UpdateVerdict } from "../api/types";
import { checkForUpdate, downloadUpdate, installUpdate, UpdateError } from "./updater";
import { Button } from "../ui/components";
import { Text } from "../ui/Text";
import { makeStyles } from "../a11y/preferences";
import { ReadableDialog } from "../a11y/reading";
import { radius, spacing } from "../theme";

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

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: t.colours.overlay, justifyContent: "center", padding: spacing.lg },
  sheet: {
    backgroundColor: t.colours.surface,
    borderRadius: radius.lg,
    borderWidth: t.border,
    borderColor: t.colours.line,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: t.type.heading, fontWeight: "700", color: t.colours.heading, lineHeight: t.type.heading * 1.35 },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.6 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  problem: { fontSize: t.type.small, color: t.colours.danger, lineHeight: t.type.small * 1.5, fontWeight: "600" },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
}));

export function UpdateGate({ children }: { children: ReactNode }) {
  const styles = useStyles();
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

  // There is nothing anybody can do about their phone's Android version, so
  // an unsupported device is not nagged.
  if (!verdict || verdict.action === "none" || verdict.action === "unsupported-device") return <>{children}</>;

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
        err instanceof UpdateError ? err.message : "The update couldn't be downloaded. Check your connection and try again.",
      );
    }
  };

  const busy = progress !== null;

  return (
    <>
      {children}
      <Modal visible transparent animationType="fade" onRequestClose={() => !required && setDismissed(true)}>
        <ReadableDialog open>
          <View style={styles.backdrop}>
            <View style={styles.sheet} accessibilityViewIsModal>
              <Text accessibilityRole="header" style={styles.title}>
                {required ? "This version is no longer supported" : `ASSN ${release.version} is available`}
              </Text>

              <Text style={styles.body}>{required ? verdict.reason : release.changelog || "Improvements and fixes."}</Text>
              <Text style={styles.muted}>About {Math.max(1, Math.round(release.sizeBytes / (1024 * 1024)))} MB to download.</Text>

              {busy && (
                <Text accessibilityLiveRegion="polite" style={styles.muted}>
                  Downloading… {Math.round((progress ?? 0) * 100)}%
                </Text>
              )}

              {problem && (
                <Text accessibilityRole="alert" style={styles.problem}>
                  {problem}
                </Text>
              )}

              <View style={styles.actions}>
                <Button label={problem ? "Try again" : "Update now"} onPress={() => void update()} busy={busy} />
                {!required && !busy && <Button label="Later" variant="outline" onPress={() => setDismissed(true)} />}
              </View>
            </View>
          </View>
        </ReadableDialog>
      </Modal>
    </>
  );
}
