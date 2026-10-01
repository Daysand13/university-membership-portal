import { useApi } from "../src/data/useApi";
import { useAuth } from "../src/auth/AuthContext";
import type { DuesSummary } from "../src/api/types";
import { makeStyles } from "../src/a11y/preferences";
import { Badge, Card, Empty, Heading, Loading, Problem, Screen } from "../src/ui/components";
import { Text } from "../src/ui/Text";

const dateFormat = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "long", year: "numeric" });

/**
 * What a student owes, and what they have paid.
 *
 * Read-only on purpose. Paying goes through the website, where the
 * Paystack callback and the webhook already land — a second payment path
 * would be a second place to get a receipt wrong.
 */

const useStyles = makeStyles((t) => ({
  amount: { fontSize: t.type.heading, fontWeight: "700", color: t.colours.heading },
  muted: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

export default function DuesScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const { data, error, loading, refresh } = useApi<DuesSummary>("/dues", { enabled: isMember });

  if (!isMember) {
    return (
      <Screen>
        <Empty title="Dues are for students" description="Graduates and patrons don't pay dues." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your dues" />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your dues."} onRetry={refresh} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
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
              {payment.academicYear} · {payment.paidAt ? dateFormat.format(new Date(payment.paidAt)) : "not completed"}
            </Text>
            <Badge
              label={payment.status === "SUCCESS" ? "Received" : payment.status === "PENDING" ? "Unfinished" : "Failed"}
              tone={payment.status === "SUCCESS" ? "good" : "warn"}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
