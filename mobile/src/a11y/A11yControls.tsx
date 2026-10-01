import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useDisplay, useTheme } from "./preferences";
import { ReadableDialog, useReading, useSpeakable } from "./reading";
import { describeControl } from "./speech-words";
import { Text } from "../ui/Text";
import { Button } from "../ui/components";
import { radius, spacing, TOUCH_TARGET, TEXT_SCALE, type TextSize } from "../theme";

/**
 * The website's accessibility toolbar, in the app's header.
 *
 * Two round buttons on every screen, where the website puts them on a phone:
 * Read Aloud, and Display — text size, high contrast and dark mode, in one
 * small sheet. The same three sizes as the website rather than a slider,
 * because a slider is hard to set precisely with a tremor or with TalkBack.
 * Everything is kept on the phone and applies to every screen at once.
 */

type ViewInstance = React.ComponentRef<typeof View>;

const SIZES: { value: TextSize; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
  { value: "larger", label: "Larger" },
];

const useStyles = makeStyles((t) => ({
  headerButtons: { flexDirection: "row", gap: spacing.xs, marginRight: spacing.xs },
  round: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  roundOn: { backgroundColor: t.colours.tabActive },
  backdrop: { flex: 1, backgroundColor: t.colours.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: t.colours.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: t.highContrast ? 2 : 0,
    borderColor: t.colours.line,
    maxHeight: "88%",
  },
  sheetBody: { padding: spacing.xl, gap: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sheetTitle: { fontSize: t.type.heading, fontWeight: "700", color: t.colours.heading, flexShrink: 1 },
  label: { fontSize: t.type.body, fontWeight: "700", color: t.colours.ink },
  hint: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  sizes: { flexDirection: "row", gap: spacing.sm },
  size: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: t.highContrast ? 2.5 : 1.5,
    borderColor: t.colours.lineStrong,
    backgroundColor: t.colours.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  sizeOn: { backgroundColor: t.colours.button, borderColor: t.colours.button },
  sizeSample: { fontWeight: "700", color: t.colours.ink },
  sizeSampleOn: { color: t.colours.onButton },
  sizeLabel: { fontSize: t.type.small, color: t.colours.ink, marginTop: spacing.xs, textAlign: "center" },
  sizeLabelOn: { color: t.colours.onButton },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
  },
  switchText: { flex: 1, gap: spacing.xs },
}));

/** Read Aloud, for the header and for dialogs. */
export function ReadAloudButton({ tone = "header" }: { tone?: "header" | "sheet" }) {
  const styles = useStyles();
  const theme = useTheme();
  const { speaking, toggle } = useReading();
  const label = speaking ? "Stop reading aloud" : "Read this screen aloud";
  const iconColour = tone === "header" ? (speaking ? theme.colours.tabBar : theme.colours.onHeader) : theme.colours.accentText;

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="togglebutton"
      accessibilityLabel={label}
      accessibilityState={{ checked: speaking }}
      hitSlop={4}
      style={[styles.round, tone === "sheet" && { backgroundColor: theme.colours.surfacePressed }, speaking && styles.roundOn]}
    >
      <Ionicons name={speaking ? "stop" : "volume-high"} size={22} color={iconColour} />
    </Pressable>
  );
}

/** The two round buttons at the top right of every screen. */
export function HeaderControls() {
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.headerButtons}>
      <ReadAloudButton />
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Display settings: text size, contrast and dark mode"
        hitSlop={4}
        style={styles.round}
      >
        <Ionicons name="text" size={22} color={theme.colours.onHeader} />
      </Pressable>
      <DisplaySheet open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

function SizeChoice({ size, chosen, onChoose }: { size: (typeof SIZES)[number]; chosen: boolean; onChoose: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const ref = useSpeakable<ViewInstance>(
    describeControl({ kind: "radio", name: `${size.label} text`, checked: chosen }),
  );
  return (
    <Pressable
      ref={ref}
      onPress={onChoose}
      accessibilityRole="radio"
      accessibilityLabel={`${size.label} text`}
      accessibilityState={{ checked: chosen }}
      style={[styles.size, chosen && styles.sizeOn]}
    >
      {/* A sample at the size itself, so the choice can be seen, not just named. */}
      <Text
        speak={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.sizeSample, { fontSize: Math.round(16 * TEXT_SCALE[size.value]) }, chosen && styles.sizeSampleOn]}
      >
        A
      </Text>
      <Text speak={false} style={[styles.sizeLabel, chosen && styles.sizeLabelOn]}>
        {size.label}
      </Text>
    </Pressable>
  );
}

/** A labelled on/off row. The whole row is the control; the switch is its picture. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const ref = useSpeakable<ViewInstance>(`${describeControl({ kind: "checkbox", name: label, checked: value })} ${hint}`);
  return (
    <Pressable
      ref={ref}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      style={styles.switchRow}
    >
      <View style={styles.switchText}>
        <Text speak={false} style={styles.label}>
          {label}
        </Text>
        <Text speak={false} style={styles.hint}>
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        // The row is the control; this is only its picture.
        accessibilityElementsHidden
        importantForAccessibility="no"
        trackColor={{ true: theme.colours.button, false: theme.colours.lineStrong }}
        thumbColor={theme.colours.white}
      />
    </Pressable>
  );
}

export function DisplaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const styles = useStyles();
  const { preferences, setTextSize, setHighContrast, setDark } = useDisplay();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ReadableDialog open={open}>
        {/* The backdrop closes the sheet for a sighted tap outside it. It is
            not a control TalkBack should offer — a button the size of the
            screen only gets in the way — so it is out of the accessibility
            tree; Done and the back gesture close the sheet for everyone.
            "no", not "no-hide-descendants": the sheet inside stays reachable. */}
        <Pressable style={styles.backdrop} onPress={onClose} accessible={false} importantForAccessibility="no">
          {/* Taps on the sheet itself must not fall through to the backdrop. */}
          <Pressable style={styles.sheet} onPress={() => {}} accessible={false} importantForAccessibility="no" accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <View style={styles.sheetHeader}>
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  Display settings
                </Text>
                <ReadAloudButton tone="sheet" />
              </View>

              <View accessibilityRole="radiogroup" accessibilityLabel="Text size" style={{ gap: spacing.sm }}>
                <Text style={styles.label}>Text size</Text>
                <View style={styles.sizes}>
                  {SIZES.map((size) => (
                    <SizeChoice
                      key={size.value}
                      size={size}
                      chosen={preferences.textSize === size.value}
                      onChoose={() => setTextSize(size.value)}
                    />
                  ))}
                </View>
              </View>

              <SwitchRow
                label="High contrast"
                hint="Stronger text and borders."
                value={preferences.highContrast}
                onChange={setHighContrast}
              />
              <SwitchRow
                label="Dark mode"
                hint="Light text on a dark background."
                value={preferences.dark}
                onChange={setDark}
              />

              <Text style={styles.hint}>Saved on this phone.</Text>
              <Button label="Done" onPress={onClose} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </ReadableDialog>
    </Modal>
  );
}
