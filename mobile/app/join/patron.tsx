import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { api } from "../../src/api/client";
import { useApi } from "../../src/data/useApi";
import { makeStyles } from "../../src/a11y/preferences";
import { Body, Button, Card, Heading, Screen, SectionLabel } from "../../src/ui/components";
import { CheckField, FormAlert, SelectField, TextField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";
import { refusal, type FieldErrors, type JoinOptions } from "../../src/join/shared";
import { spacing } from "../../src/theme";

/**
 * Somebody offering to support the association.
 *
 * The website's form and its words. A patron is reviewed before they can
 * sign in, so this ends on a "sent" screen rather than a dashboard, and the
 * association emails them with the decision.
 */

const LABELS: Record<string, string> = {
  title: "Title",
  fullName: "Full name",
  email: "Email address",
  phone: "Telephone number",
  address: "Town / address",
  region: "Region",
  occupation: "Occupation",
  organization: "Organisation",
  jobTitle: "Position",
  supportInterest: "How you'd like to support",
  motivation: "Why you'd like to become a patron",
  password: "Password",
  confirmPassword: "Confirm password",
  consent: "Confirmation",
};

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.lg },
  consent: { fontSize: t.type.small, color: t.colours.ink, lineHeight: t.type.small * 1.6 },
}));

export default function PatronSignUpScreen() {
  const styles = useStyles();
  const { data: options } = useApi<JoinOptions>("/join/options", { cacheKey: "join-options" });
  const [values, setValues] = useState({
    title: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
    region: "",
    occupation: "",
    organization: "",
    jobTitle: "",
    supportInterest: "",
    motivation: "",
    password: "",
    confirmPassword: "",
    consent: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set =
    <K extends keyof typeof values>(field: K) =>
    (value: (typeof values)[K]) => {
      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors(({ [field as string]: _gone, ...rest }) => rest);
    };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await api.post<{ ok: true; email: string }>("/join/patron", values, { open: true });
      router.replace({ pathname: "/join/sent", params: { kind: "patron", email: response.email } });
    } catch (err) {
      const refused = refusal(err, LABELS);
      setFieldErrors(refused.fieldErrors);
      setProblem(refused.message);
    } finally {
      setBusy(false);
    }
  };

  const fe = fieldErrors;
  const titles = [{ value: "", label: "None" }, ...(options?.patron.titles ?? []).map((t) => ({ value: t, label: t }))];
  const regions = [{ value: "", label: "Not given" }, ...(options?.student.regions ?? []).map((r) => ({ value: r, label: r }))];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Become a patron</Heading>
        <Body muted>The association reviews every application and emails you with its decision.</Body>

        <SectionLabel>About you</SectionLabel>
        <Card style={styles.section}>
          <SelectField label="Title" value={values.title} options={titles} onChange={set("title")} error={fe.title} placeholder="None" />
          <TextField label="Full name" value={values.fullName} onChange={set("fullName")} error={fe.fullName} autoComplete="name" required />
          <TextField
            label="Email address"
            value={values.email}
            onChange={set("email")}
            error={fe.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            required
          />
          <TextField
            label="Telephone number"
            value={values.phone}
            onChange={set("phone")}
            error={fe.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0240000000"
            required
          />
          <TextField label="Town / address" value={values.address} onChange={set("address")} error={fe.address} autoComplete="street-address" />
          <SelectField label="Region" value={values.region} options={regions} onChange={set("region")} error={fe.region} placeholder="Not given" />
        </Card>

        <SectionLabel>Your work</SectionLabel>
        <Card style={styles.section}>
          <TextField
            label="Occupation / profession"
            value={values.occupation}
            onChange={set("occupation")}
            error={fe.occupation}
            placeholder="Lecturer, medical doctor, business owner…"
            required
          />
          <TextField label="Organisation / employer" value={values.organization} onChange={set("organization")} error={fe.organization} />
          <TextField label="Position / job title" value={values.jobTitle} onChange={set("jobTitle")} error={fe.jobTitle} />
        </Card>

        <SectionLabel>Your support</SectionLabel>
        <Card style={styles.section}>
          <TextField
            label="How would you like to support the association?"
            value={values.supportInterest}
            onChange={set("supportInterest")}
            error={fe.supportInterest}
            placeholder="Mentoring students, advocacy, funding, professional advice…"
            multiline
          />
          <TextField
            label="Why would you like to become a patron?"
            value={values.motivation}
            onChange={set("motivation")}
            error={fe.motivation}
            multiline
          />
        </Card>

        <SectionLabel>Your password</SectionLabel>
        <Card style={styles.section}>
          <TextField
            label="Password"
            hint={options?.passwordRule ?? "At least 8 characters, with an uppercase letter, a lowercase letter and a number."}
            value={values.password}
            onChange={set("password")}
            error={fe.password}
            secret
            autoCapitalize="none"
            autoComplete="new-password"
            required
          />
          <TextField
            label="Confirm password"
            value={values.confirmPassword}
            onChange={set("confirmPassword")}
            error={fe.confirmPassword}
            secret
            autoCapitalize="none"
            autoComplete="new-password"
            required
          />
        </Card>

        <CheckField label="I confirm my details and agree to be contacted" checked={values.consent} onChange={set("consent")} error={fe.consent}>
          <Text style={styles.consent}>
            I confirm the details above are accurate, and I agree that the association may contact me about my application
            and its work.
          </Text>
        </CheckField>

        <FormAlert message={problem} />
        <Button label={busy ? "Sending…" : "Send my application"} busy={busy} onPress={() => void submit()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
