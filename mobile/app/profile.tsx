import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform } from "react-native";
import { useApi } from "../src/data/useApi";
import { useAuth } from "../src/auth/AuthContext";
import { api, ApiError } from "../src/api/client";
import type { EditableContact, MemberProfile } from "../src/api/types";
import { makeStyles } from "../src/a11y/preferences";
import { Body, Button, Card, Heading, Loading, Problem, Screen, SectionLabel } from "../src/ui/components";
import { FormAlert, TextField } from "../src/ui/form";
import { Text } from "../src/ui/Text";
import { SITE_URL } from "../src/config";

/**
 * A student's own record, and the contact details they may change: the
 * same five as the website's profile page, saved through the same service,
 * which emails them a note of what changed. Their name, index number and
 * programme are the association's to correct, so those are shown, not
 * edited.
 */

const useStyles = makeStyles((t) => ({
  label: { fontSize: t.type.small, fontWeight: "700", color: t.colours.muted },
  value: { fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.4 },
  saved: { fontSize: t.type.small, color: t.colours.success },
}));

const FIELDS: { key: keyof EditableContact; label: string; required?: boolean; keyboard?: "phone-pad"; multiline?: boolean }[] = [
  { key: "phone", label: "Phone number", required: true, keyboard: "phone-pad" },
  { key: "region", label: "Region" },
  { key: "residentialAddress", label: "Residential address", multiline: true },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhone", label: "Emergency contact phone", keyboard: "phone-pad" },
];

export default function ProfileScreen() {
  const styles = useStyles();
  const { identity } = useAuth();
  const isMember = identity?.audience === "MEMBER";
  const { data, error, loading, refresh } = useApi<{ profile: MemberProfile }>("/profile", { enabled: isMember });
  const [form, setForm] = useState<EditableContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data.profile.editable);
  }, [data, form]);

  if (!isMember) {
    return (
      <Screen scroll>
        <Heading>Your profile</Heading>
        <Body muted>Your profile is kept up to date on the association&apos;s website.</Body>
        <Button label="Open my profile on the website" variant="outline" onPress={() => void Linking.openURL(`${SITE_URL}/login`)} />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Loading what="your profile" />
      </Screen>
    );
  }
  if (error || !data || !form) {
    return (
      <Screen>
        <Problem message={error ?? "We couldn't load your profile."} onRetry={refresh} />
      </Screen>
    );
  }

  const p = data.profile;
  const save = async () => {
    setSaving(true);
    setProblem(null);
    setFieldErrors({});
    setSaved(null);
    try {
      const reply = await api.post<{ profile: MemberProfile }>("/profile", form);
      setForm(reply.profile.editable);
      setSaved("Saved. We've emailed you a note of what changed.");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setFieldErrors(err.fieldErrors);
      else setProblem(err instanceof Error ? err.message : "Your changes couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const facts: [string, string][] = [
    ["Index number", p.indexNumber],
    ["Programme", p.programme],
    ["Level", p.level],
    ["Campus", p.campus],
    ["Category of special needs", p.specialNeedsCategory],
    ["Email", p.email],
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>{p.name}</Heading>

        <Card>
          {facts.map(([label, value]) => (
            <Text key={label} style={styles.value} accessibilityLabel={`${label}: ${value || "not given"}`}>
              <Text style={styles.label}>{label}: </Text>
              {value || "—"}
            </Text>
          ))}
        </Card>
        <Body muted>To correct any of these, contact the association: they are on your official record.</Body>

        <SectionLabel>Your contact details</SectionLabel>
        {FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={form[field.key]}
            onChange={(value) => setForm({ ...form, [field.key]: value })}
            required={field.required}
            keyboardType={field.keyboard}
            multiline={field.multiline}
            error={fieldErrors[field.key]}
          />
        ))}
        <FormAlert message={problem} />
        {saved && (
          <Text accessibilityLiveRegion="polite" style={styles.saved}>
            {saved}
          </Text>
        )}
        <Button label="Save my details" busy={saving} onPress={() => void save()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
