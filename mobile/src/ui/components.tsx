import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colours, HEADER_GRADIENT, radius, shadow, spacing, TOUCH_TARGET, type } from "../theme";

/**
 * The pieces every screen is built from.
 *
 * Three rules run through all of them, and they are the same three the
 * website was put right on:
 *
 *  - Nothing is described by colour alone. A status has words as well.
 *  - Every control has a name a screen reader can say, and is at least
 *    48dp, because a member with a tremor cannot hit a small button.
 *  - Nothing assumes text is one line. Android's font scaling goes up to
 *    twice the size, and several of this association's members use it.
 */

export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <Body style={styles.screenBody} contentContainerStyle={scroll ? styles.scrollBody : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 }) {
  return (
    <Text
      accessibilityRole="header"
      style={level === 1 ? styles.title : styles.heading}
      // A heading may be three lines at the largest font size. Let it be.
      numberOfLines={0}
    >
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
  busy?: boolean;
}) {
  const unusable = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={unusable}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unusable, busy }}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        unusable && styles.buttonDisabled,
        pressed && !unusable && styles.buttonPressed,
      ]}
    >
      {busy && <ActivityIndicator size="small" color={variant === "outline" ? colours.primary : colours.white} />}
      <Text style={[styles.buttonLabel, variant === "outline" && styles.buttonLabelOutline]}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <View style={styles.centred} accessibilityRole="progressbar" accessibilityLabel={`Loading ${what}`}>
      <ActivityIndicator size="large" color={colours.primary} />
      <Text style={styles.muted}>Loading {what}…</Text>
    </View>
  );
}

export function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.centred}>
      {/* role=alert so a screen reader says it without being asked. */}
      <Text accessibilityRole="alert" style={styles.problemText}>
        {message}
      </Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="outline" />}
    </View>
  );
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.centred}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.muted}>{description}</Text>}
    </View>
  );
}

/** "Saved copy" — shown when the network was unavailable. Never silent. */
export function OfflineNotice() {
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineText}>
        You&apos;re offline. This is the copy saved on your phone, so it may not be the latest.
      </Text>
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" }) {
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
  return <View style={styles.row}>{children}</View>;
}

/**
 * The bar across the top of every screen.
 *
 * Passed to the navigator as `headerBackground`, so one gradient covers the
 * status bar, the title and the back arrow without any screen knowing about
 * it. Deep on the left, lighter on the right — the light end is still dark
 * enough to carry a white title, which is what fixes its shade.
 */
export function GradientHeader() {
  return (
    <LinearGradient
      colors={[...HEADER_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * "YOUR MEMBERSHIP", "WHAT'S ON" — the small label above a group of cards.
 *
 * Marked as a heading so a screen reader can jump between sections, which
 * is how somebody using one navigates a long screen. Spaced capitals are a
 * visual device, not a reading one.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

/**
 * The picture on an article or an event.
 *
 * Hidden from the screen reader on purpose. These images are uploaded
 * without any description — the schema has nowhere to put one — and a
 * screen reader announcing "image" before every headline is noise that
 * tells a reader nothing. The headline beside it carries the meaning.
 *
 * It removes itself if the file will not load. A grey box where a picture
 * should be reads as a broken app; a card with no picture reads as a card
 * with no picture.
 */
export function CoverImage({ url, style }: { url: string | null; style?: StyleProp<ImageStyle> }) {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.surfaceMuted },
  screenBody: { flex: 1 },
  scrollBody: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: type.title, fontWeight: "700", color: colours.primary, marginBottom: spacing.xs },
  heading: { fontSize: type.heading, fontWeight: "700", color: colours.primary, marginBottom: spacing.xs },
  body: { fontSize: type.body, color: colours.ink, lineHeight: type.body * 1.5 },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.lg,
    // Hairline as well as shadow. The shadow is the soft look; the border
    // is what somebody with low vision actually uses to tell one card from
    // the next.
    borderWidth: 1,
    borderColor: colours.line,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardPressed: { backgroundColor: colours.surfaceMuted },
  button: {
    // Above the 48dp floor, not at it. A primary action is the thing most
    // people are reaching for.
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colours.primaryMid,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadow.raised,
  },
  buttonPressed: { backgroundColor: colours.primary },
  buttonOutline: {
    backgroundColor: colours.surface,
    borderWidth: 1.5,
    borderColor: colours.primaryMid,
    // An outline button is a quieter choice and should not float.
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDanger: { backgroundColor: colours.danger, shadowColor: colours.danger },
  buttonDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  buttonLabel: { color: colours.white, fontSize: type.body, fontWeight: "700", textAlign: "center" },
  buttonLabelOutline: { color: colours.primaryMid },
  sectionLabel: {
    fontSize: type.tiny,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colours.slate,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  centred: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  problemText: { fontSize: type.body, color: colours.ink, textAlign: "center", lineHeight: type.body * 1.5 },
  emptyTitle: { fontSize: type.subheading, fontWeight: "700", color: colours.primary, textAlign: "center" },
  offline: {
    backgroundColor: colours.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colours.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  offlineText: { fontSize: type.small, color: colours.ink, lineHeight: type.small * 1.5 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colours.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeGood: { backgroundColor: colours.successLight },
  badgeWarn: { backgroundColor: colours.warningLight },
  badgeText: { fontSize: type.tiny, fontWeight: "700", color: colours.slate },
  badgeTextGood: { color: colours.success },
  badgeTextWarn: { color: colours.warning },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    // Shown while the file is still coming down, so the card does not jump
    // when it arrives.
    backgroundColor: colours.surfaceMuted,
  },
});
