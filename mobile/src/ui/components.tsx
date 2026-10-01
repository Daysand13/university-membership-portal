import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { makeStyles, useTheme } from "../a11y/preferences";
import { ReadableScreen, SpokenFor, useSpeakable } from "../a11y/reading";
import { describeControl } from "../a11y/speech-words";
import { radius, spacing, TOUCH_TARGET } from "../theme";
import { Text } from "./Text";

/**
 * The pieces every screen is built from.
 *
 * Four rules run through all of them, the same ones the website was put
 * right on:
 *
 *  - Nothing is described by colour alone. A status has words as well.
 *  - Every control has a name and a role TalkBack can say, and says itself
 *    to Read Aloud in the website's own words ("Sign in, button.").
 *  - Every control is at least 48dp, because a member with a tremor cannot
 *    hit a small button.
 *  - Nothing assumes text is one line. The larger text sizes, and Android's
 *    own font scaling on top, mean a heading may be three lines. Let it be.
 */

type ViewInstance = React.ComponentRef<typeof View>;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colours.background },
  scrollBody: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: t.type.title, lineHeight: t.type.title * 1.3, fontWeight: "700", color: t.colours.heading },
  heading: { fontSize: t.type.heading, lineHeight: t.type.heading * 1.35, fontWeight: "700", color: t.colours.heading },
  body: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.55 },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  card: {
    backgroundColor: t.colours.surface,
    borderRadius: radius.lg,
    // A border as well as the shadow: the shadow is the soft look, the
    // border is what somebody with low vision uses to tell one card from the
    // next. In dark mode the shadow is invisible and the border does it all.
    borderWidth: t.border,
    borderColor: t.colours.line,
    padding: spacing.lg,
    gap: spacing.sm,
    ...t.shadow.card,
  },
  cardPressed: { backgroundColor: t.colours.surfacePressed },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: t.colours.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...t.shadow.raised,
  },
  buttonPressed: { backgroundColor: t.colours.buttonPressed },
  buttonOutline: {
    backgroundColor: t.colours.surface,
    borderWidth: t.highContrast ? 2.5 : 1.5,
    borderColor: t.colours.accentText,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: { backgroundColor: t.colours.danger, shadowColor: t.colours.danger },
  buttonDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  buttonLabel: {
    color: t.colours.onButton,
    fontSize: t.type.body,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  buttonLabelOutline: { color: t.colours.accentText },
  buttonLabelDanger: { color: t.dark ? "#1A0705" : t.colours.white },
  centred: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  problemText: { fontSize: t.type.body, color: t.colours.ink, textAlign: "center", lineHeight: t.type.body * 1.5 },
  emptyTitle: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading, textAlign: "center" },
  emptyText: { fontSize: t.type.small, color: t.colours.muted, textAlign: "center", lineHeight: t.type.small * 1.5 },
  offline: {
    backgroundColor: t.colours.warningBg,
    borderBottomWidth: t.border,
    borderBottomColor: t.colours.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  offlineText: { fontSize: t.type.small, color: t.colours.warning, lineHeight: t.type.small * 1.5, fontWeight: "600" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: t.colours.surfacePressed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeGood: { backgroundColor: t.colours.successBg },
  badgeWarn: { backgroundColor: t.colours.warningBg },
  badgeText: { fontSize: t.type.tiny, fontWeight: "700", color: t.colours.ink },
  badgeTextGood: { color: t.colours.success },
  badgeTextWarn: { color: t.colours.warning },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  sectionLabel: {
    fontSize: t.type.tiny,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: t.colours.muted,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    // Shown while the picture is still coming down, so the card does not
    // jump when it arrives.
    backgroundColor: t.colours.surfacePressed,
  },
}));

/**
 * A whole screen: the background, an optional scroll, and the scope Read
 * Aloud reads while this screen is in front.
 */
export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const styles = useStyles();
  return (
    <ReadableScreen>
      {scroll ? (
        <ScrollView style={styles.screen} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.screen}>{children}</View>
      )}
    </ReadableScreen>
  );
}

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 }) {
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={level === 1 ? styles.title : styles.heading}>
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const styles = useStyles();
  return <Text style={muted ? styles.muted : styles.body}>{children}</Text>;
}

/**
 * A card. Given `onPress` it is a button, and says itself as one —
 * `accessibilityLabel` is required then, because it is all TalkBack and
 * Read Aloud have to go on: the words inside the card are not read
 * separately, or they would be read twice.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const ref = useSpeakable<ViewInstance>(
    onPress ? describeControl({ kind: "button", name: accessibilityLabel ?? "" }) : null,
  );

  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
    >
      <SpokenFor>{children}</SpokenFor>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const unusable = disabled || busy;
  const ref = useSpeakable<ViewInstance>(describeControl({ kind: "button", name: label, disabled: unusable }));

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={unusable}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unusable, busy }}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        unusable && styles.buttonDisabled,
        pressed && !unusable && variant !== "outline" && styles.buttonPressed,
      ]}
    >
      {busy && (
        <ActivityIndicator
          size="small"
          color={variant === "outline" ? theme.colours.accentText : theme.colours.onButton}
        />
      )}
      <SpokenFor>
        <Text
          style={[
            styles.buttonLabel,
            variant === "outline" && styles.buttonLabelOutline,
            variant === "danger" && styles.buttonLabelDanger,
          ]}
        >
          {label}
        </Text>
      </SpokenFor>
    </Pressable>
  );
}

export function Loading({ what }: { what: string }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.centred} accessibilityRole="progressbar" accessibilityLabel={`Loading ${what}`}>
      <ActivityIndicator size="large" color={theme.colours.accentText} />
      <Text style={styles.muted}>Loading {what}…</Text>
    </View>
  );
}

export function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.centred}>
      {/* role=alert so TalkBack says it without being asked. */}
      <Text accessibilityRole="alert" style={styles.problemText}>
        {message}
      </Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="outline" />}
    </View>
  );
}

export function Empty({ title, description }: { title: string; description?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.centred}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyText}>{description}</Text>}
    </View>
  );
}

/** "Saved copy" — shown when the network was unavailable. Never silent. */
export function OfflineNotice() {
  const styles = useStyles();
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineText}>
        You&apos;re offline. This is the copy saved on your phone, so it may not be the latest.
      </Text>
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" }) {
  const styles = useStyles();
  return (
    // The word is the label; the colour only agrees with it.
    <View style={[styles.badge, tone === "good" && styles.badgeGood, tone === "warn" && styles.badgeWarn]}>
      <Text style={[styles.badgeText, tone === "good" && styles.badgeTextGood, tone === "warn" && styles.badgeTextWarn]}>
        {label}
      </Text>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.row}>{children}</View>;
}

/**
 * The bar across the top of every screen, passed to the navigators as
 * `headerBackground`. The light end is still dark enough to carry a white
 * title — that is what fixes its shade (theme.ts, tests/theme.test.ts).
 */
export function GradientHeader() {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.colours.headerFrom, theme.colours.headerTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * "SHORTCUTS", "THIS PHONE" — the small label above a group of cards.
 * Marked as a heading, because jumping between headings is how somebody on
 * TalkBack gets round a long screen.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

/**
 * The picture on an article or an event.
 *
 * Hidden from TalkBack and Read Aloud on purpose. These images are uploaded
 * with no description anywhere to put one, and "image" said before every
 * headline tells a reader nothing the headline does not.
 *
 * It removes itself if the file will not load: a grey box where a picture
 * should be reads as a broken app; a card with no picture reads as a card
 * with no picture.
 */
export function CoverImage({ url, style }: { url: string | null; style?: StyleProp<ImageStyle> }) {
  const styles = useStyles();
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <Image
      source={{ uri: url }}
      style={[styles.cover, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** For screens that need the theme's text styles directly. */
export function useTextStyles() {
  const styles = useStyles();
  return { title: styles.title, heading: styles.heading, body: styles.body, muted: styles.muted };
}

export { TOUCH_TARGET };
