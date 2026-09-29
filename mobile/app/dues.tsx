import { ScrollView, StyleSheet, Text } from "react-native";
import { useApi } from "../src/data/useApi";
import { useAuth } from "../src/auth/AuthContext";
import type { DuesSummary } from "../src/api/types";
import { Badge, Card, Empty, Heading, Loading, Problem } from "../src/ui/components";
import { colours, spacing, type } from "../src/theme";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * What a student owes, and what they have paid.
 *
 * Read-only on purpose. Paying goes through the website, where the
 * Paystack callback and the webhook already land — a second payment path
 * would be a second place to get a receipt wrong.
 */
export default function DuesScreen() {
  const { signedIn, identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const { data, error, loading, refresh } = useApi<DuesSummary>("/dues", { enabled: signedIn && isMember });

  if (!signedIn) return <Empty title="Sign in to see your dues" />;
  if (!isMember) return <Empty title="Dues are for students" description="Graduates and patrons don't pay dues." />;
  if (loading) return <Loading what="your dues" />;
  if (error || !data) return <Problem message={error ?? "We couldn't load your dues."} onRetry={refresh} />;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Heading>{data.academicYear}</Heading>

      <Card>
        <Badge label={data.paid ? "Paid" : "Not paid yet"} tone={data.paid ? "good" : "warn"} />
        <Text style={styles.amount}>{data.fee.amountLabel}</Text>
        <Text style={styles.muted}>{data.fee.tierLabel}</Text>
        {!data.paid && (
          <Text style={styles.muted}>
            Pay on the association&apos;s website, or at the office — an officer can record it for you there.
          </Text>
        )}
      </Card>

      <Heading level={2}>Your payments</Heading>
      {data.payments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Nothing recorded yet.</Text>
        </Card>
      ) : (
        data.payments.map((payment) => (
          <Card key={payment.id}>
            <Text style={styles.amount}>{payment.amountLabel}</Text>
            <Text style={styles.muted}>
              {payment.academicYear} ·{" "}
              {payment.paidAt ? dateFormat.format(new Date(payment.paidAt)) : "not completed"}
            </Text>
            <Badge
              label={payment.status === "SUCCESS" ? "Received" : payment.status === "PENDING" ? "Unfinished" : "Failed"}
              tone={payment.status === "SUCCESS" ? "good" : "warn"}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  amount: { fontSize: type.heading, fontWeight: "700", color: colours.primary },
  muted: { fontSize: type.small, color: colours.slate, lineHeight: type.small * 1.5 },
});
