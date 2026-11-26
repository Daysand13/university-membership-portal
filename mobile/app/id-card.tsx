import { useCallback, useEffect, useState } from "react";
import { Image, Linking, View } from "react-native";
import { api, OfflineError } from "../src/api/client";
import type { IdCardReply } from "../src/api/types";
import { forgetSavedCard, readSavedCard, saveCard, type ReadyCard } from "../src/data/id-card-store";
import { useAuth } from "../src/auth/AuthContext";
import { makeStyles } from "../src/a11y/preferences";
import { Badge, Body, Button, Card, Empty, Heading, Loading, Problem, Screen, SectionLabel } from "../src/ui/components";
import { Text } from "../src/ui/Text";
import { SITE_URL } from "../src/config";
import { spacing } from "../src/theme";

/**
 * A student's association ID card, on their phone.
 *
 * Both sides as the website draws them, and - first, for a screen reader -
 * what is on the card as words. The last card fetched is kept on the phone,
 * so it can be shown at a gate with no signal; when that saved copy is what
 * is on screen, it says so.
 *
 * Kept by src/data/id-card-store.ts, and removed at sign-out.
 */

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

const useStyles = makeStyles((t) => ({
  card: { width: "100%", aspectRatio: 1.586, borderRadius: 12, backgroundColor: t.colours.surface },
  label: { fontSize: t.type.small, fontWeight: "700", color: t.colours.muted },
  value: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.4 },
  sides: { gap: spacing.md },
}));

export default function IdCardScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const [card, setCard] = useState<ReadyCard | null>(null);
  const [notice, setNotice] = useState<{ status: string; message: string } | null>(null);
  const [fromPhone, setFromPhone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);
    try {
      const reply = await api.get<IdCardReply>("/id-card");
      if (reply.status === "ready") {
        setCard(reply);
        setNotice(null);
        setFromPhone(false);
        saveCard(reply);
      } else {
        // No card this year: an old saved one would no longer be valid.
        setCard(null);
        setNotice(reply);
        forgetSavedCard();
      }
    } catch (err) {
      const kept = await readSavedCard();
      if (kept) {
        setCard(kept);
        setFromPhone(true);
      } else {
        setProblem(err instanceof OfflineError ? "You're offline, and there's no card saved on this phone yet." : "We couldn't load your card.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMember) void load();
  }, [isMember, load]);

  if (!isMember) {
    return (
      <Screen>
        <Empty title="ID cards are for students" description="Graduates and patrons aren't issued an association ID card." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your ID card" />
      </Screen>
    );
  }
  if (notice) {
    return (
      <Screen scroll>
        <Heading>Your ID card</Heading>
        <Card>
          <Text accessibilityRole="alert" style={styles.value}>
            {notice.message}
          </Text>
        </Card>
        {notice.status === "dues_unpaid" && (
          <Button label="Pay dues on the website" onPress={() => void Linking.openURL(`${SITE_URL}/membership/dashboard/dues`)} />
        )}
      </Screen>
    );
  }
  if (problem || !card) {
    return (
      <Screen>
        <Problem message={problem ?? "We couldn't load your card."} onRetry={load} />
      </Screen>
    );
  }

  const d = card.details;
  const words = [
    `Association of Students with Special Needs, University of Education, Winneba. Member ID card.`,
    `Name: ${d.fullName}.`,
    `Index number: ${d.indexNumber}.`,
    `Programme: ${d.programme}.`,
    d.specialNeedsCategory ? `Category: ${d.specialNeedsCategory}.` : "",
    `Valid until ${d.validUntil}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Screen scroll>
      <Heading>Your ID card</Heading>
      {fromPhone ? (
        <Badge label={`Saved on this phone ${dateFormat.format(new Date(card.issuedAt))} (offline)`} tone="warn" />
      ) : (
        <Badge label={`Valid for ${card.academicYear}`} tone="good" />
      )}

      <Card>
        {(
          [
            ["Name", d.fullName],
            ["Index number", d.indexNumber],
            ["Programme", d.programme],
            ["Category", d.specialNeedsCategory],
            ["Valid until", d.validUntil],
          ] as const
        ).map(([label, value]) =>
          value ? (
            <Text key={label} style={styles.value} accessibilityLabel={`${label}: ${value}`}>
              <Text style={styles.label}>{label}: </Text>
              {value}
            </Text>
          ) : null,
        )}
      </Card>

      <SectionLabel>The card</SectionLabel>
      <View style={styles.sides}>
        <Image
          source={{ uri: `data:image/png;base64,${card.front}` }}
          style={styles.card}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Front of the card. ${words}`}
        />
        <Image
          source={{ uri: `data:image/png;base64,${card.back}` }}
          style={styles.card}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel="Back of the card, with the QR code that confirms membership when scanned."
        />
      </View>
      <Body muted>Show this at the association&apos;s events and offices. The QR code confirms your membership when scanned.</Body>
      {fromPhone && <Button label="Try again for the latest card" variant="outline" onPress={() => void load()} />}
    </Screen>
  );
}
