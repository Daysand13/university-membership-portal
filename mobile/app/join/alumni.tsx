import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { api } from "../../src/api/client";
import type { SignedIn } from "../../src/api/types";
import { describeThisPhone, useAuth } from "../../src/auth/AuthContext";
import { registerForPush } from "../../src/push/register";
import { useApi } from "../../src/data/useApi";
import { makeStyles } from "../../src/a11y/preferences";
import { Body, Button, Card, Heading, Screen } from "../../src/ui/components";
import { CheckField, FormAlert, SelectField, TextField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";
import { refusal, type FieldErrors, type JoinOptions } from "../../src/join/shared";
import { spacing } from "../../src/theme";

/**
 * A graduate joining the alumni network.
 *
 * The website's form and its words. An alumni account needs no approval, so
 * the server answers this exactly as it answers a sign-in, and the app goes
 * straight to the new member's dashboard — nobody who has just chosen a
 * password should have to type it in again a moment later.
 */

const LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email address",
  phone: "Phone number",
  graduationYear: "Graduation year",
  programme: "Program of study",
  profession: "Profession",
  currentLocation: "Current location",
  password: "Password",
  consent: "Agreement",
};

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.lg },
  consent: { fontSize: t.type.small, color: t.colours.ink, lineHeight: t.type.small * 1.6 },
}));

const thisYear = new Date().getFullYear();

export default function AlumniSignUpScreen() {
  const styles = useStyles();
  const { adoptSession } = useAuth();
  const { data: options } = useApi<JoinOptions>("/join/options", { cacheKey: "join-options" });
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    phone: "",
    graduationYear: "",
    programme: "",
    profession: "",
    currentLocation: "",
    password: "",
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
      const session = await api.post<SignedIn>("/join/alumni", { ...values, device: describeThisPhone() }, { open: true });
      // Signed in: the router takes it from here, straight to the dashboard.
      await adoptSession(session);
      void registerForPush();
    } catch (err) {
      const refused = refusal(err, LABELS);
      setFieldErrors(refused.fieldErrors);
      setProblem(refused.message);
    } finally {
      setBusy(false);
    }
  };

  const fe = fieldErrors;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>Join the alumni network</Heading>
        <Body muted>For graduates of the University of Education, Winneba. Your account is ready as soon as you send this.</Body>

        <Card style={styles.section}>
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
            label="Phone number / WhatsApp"
            value={values.phone}
            onChange={set("phone")}
            error={fe.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0240000000"
            required
          />
          <SelectField
            label="Graduation year"
            value={values.graduationYear}
            options={Array.from({ length: thisYear + 1 - 1960 + 1 }, (_, i) => String(thisYear + 1 - i))}
            onChange={set("graduationYear")}
            error={fe.graduationYear}
            required
          />
          <TextField label="Program of study" value={values.programme} onChange={set("programme")} error={fe.programme} required />
          <TextField label="Profession / job title" value={values.profession} onChange={set("profession")} error={fe.profession} />
          <TextField label="Current location / region" value={values.currentLocation} onChange={set("currentLocation")} error={fe.currentLocation} />
          <TextField
            label="Choose a password"
            hint={options?.passwordRule ?? "At least 8 characters, with an uppercase letter, a lowercase letter and a number."}
            value={values.password}
            onChange={set("password")}
            error={fe.password}
            secret
            autoCapitalize="none"
            autoComplete="new-password"
            required
          />
        </Card>

        <CheckField label="I agree to join the alumni network" checked={values.consent} onChange={set("consent")} error={fe.consent}>
          <Text style={styles.consent}>
            I agree to join the Association of Students with Special Needs alumni network and permit my professional
            details to be visible in the secure directory.
          </Text>
        </CheckField>

        <FormAlert message={problem} />
        <Button label={busy ? "Creating your account…" : "Create my account"} busy={busy} onPress={() => void submit()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
