import { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { useApi } from "../../src/data/useApi";
import { makeStyles } from "../../src/a11y/preferences";
import { Body, Button, Card, Heading, Loading, Problem, Screen, SectionLabel } from "../../src/ui/components";
import { CheckField, FileField, FormAlert, RadioGroup, SelectField, TextField, DateField } from "../../src/ui/form";
import { Text } from "../../src/ui/Text";
import {
  AttachProblem,
  attachDocument,
  attachFromCamera,
  attachFromPhotos,
  type AttachKind,
  type Attached,
} from "../../src/join/attach";
import { formatBytes } from "../../src/join/shrink";
import { clearDraft, loadDraft, refusal, saveDraft, type FieldErrors, type JoinOptions, type Track } from "../../src/join/shared";
import { radius, spacing } from "../../src/theme";

/**
 * A student's application — undergraduate or postgraduate.
 *
 * The website's form, section for section and in its words, because the
 * same membership team reads both and the same checks are made on both
 * (registration-service on the server). What differs is only what a phone
 * is better at: the passport photo can be taken there and then, and the
 * form is kept as a draft so that Android closing the app behind the
 * camera does not cost anybody what they had typed.
 *
 * Nothing is checked here that the server does not check again. What is
 * checked here is only what saves a wasted round trip: that both documents
 * are attached and finished uploading.
 */

interface Values {
  membershipType: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  campus: string;
  hallOfAffiliation: string;
  degreeCategory: string;
  academicDepartment: string;
  programme: string;
  level: string;
  indexNumber: string;
  yearOfAdmission: string;
  expectedGraduationYear: string;
  department: string;
  specificSupportNeeds: string[];
  residentialAddress: string;
  region: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  agreedToTerms: boolean;
  uewAlumnus: string;
  alumniGraduationYear: string;
  alumniProgramme: string;
}

const EMPTY: Values = {
  membershipType: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phone: "",
  campus: "",
  hallOfAffiliation: "",
  degreeCategory: "",
  academicDepartment: "",
  programme: "",
  level: "",
  indexNumber: "",
  yearOfAdmission: "",
  expectedGraduationYear: "",
  department: "",
  specificSupportNeeds: [],
  residentialAddress: "",
  region: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  agreedToTerms: false,
  uewAlumnus: "",
  alumniGraduationYear: "",
  alumniProgramme: "",
};

interface Draft {
  values: Values;
  passport: Attached | null;
  medical: Attached | null;
}

/** What each field is called, for the summary beside the submit button. */
const LABELS: Record<string, string> = {
  membershipType: "Membership status",
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Surname",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  email: "Personal email address",
  phone: "Phone number",
  campus: "UEW campus",
  hallOfAffiliation: "Hall of affiliation",
  degreeCategory: "Postgraduate degree category",
  academicDepartment: "Academic department",
  programme: "Program of study",
  level: "Level",
  indexNumber: "Index number",
  yearOfAdmission: "Year of admission",
  expectedGraduationYear: "Expected graduation year",
  department: "Category of special needs",
  specificSupportNeeds: "Support needed",
  profilePicture: "Passport picture",
  medicalReportKey: "Medical report",
  residentialAddress: "Residential address",
  region: "Region",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  agreedToTerms: "Confirmation",
  uewAlumnus: "UEW graduate",
  alumniGraduationYear: "Year you graduated from UEW",
  alumniProgramme: "Programme you completed at UEW",
};

const useStyles = makeStyles((t) => ({
  notice: {
    backgroundColor: t.colours.warningBg,
    borderRadius: radius.lg,
    borderWidth: t.border,
    borderColor: t.colours.warning,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noticeText: { fontSize: t.type.small, color: t.colours.ink, lineHeight: t.type.small * 1.6 },
  strong: { fontWeight: "700" },
  section: { gap: spacing.lg },
  preview: { width: 96, height: 96, borderRadius: 48, backgroundColor: t.colours.surfacePressed },
  progress: { fontSize: t.type.small, color: t.colours.accentText, fontWeight: "600" },
  attachError: { fontSize: t.type.small, color: t.colours.danger, fontWeight: "600", lineHeight: t.type.small * 1.5 },
  warning: {
    backgroundColor: t.colours.warningBg,
    borderRadius: radius.md,
    borderWidth: t.highContrast ? 2.5 : 2,
    borderColor: t.colours.warning,
    padding: spacing.lg,
  },
  warningText: { fontSize: t.type.small, color: t.colours.ink, lineHeight: t.type.small * 1.55 },
}));

const thisYear = new Date().getFullYear();
const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => String(from > to ? from - i : from + i));

export default function StudentApplicationScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ track?: string }>();
  const track: Track = params.track === "POSTGRADUATE" ? "POSTGRADUATE" : "UNDERGRADUATE";
  const isPg = track === "POSTGRADUATE";
  const draftKey = `student:${track}`;

  const { data: options, error: optionsError, loading, refresh } = useApi<JoinOptions>("/join/options", {
    cacheKey: "join-options",
  });

  const [values, setValues] = useState<Values>(EMPTY);
  const [passport, setPassport] = useState<Attached | null>(null);
  const [medical, setMedical] = useState<Attached | null>(null);
  const [restored, setRestored] = useState(false);
  const [attaching, setAttaching] = useState<{ kind: AttachKind; progress: number } | null>(null);
  const [attachErrors, setAttachErrors] = useState<Partial<Record<AttachKind, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadDraft<Draft>(draftKey).then((draft) => {
      if (draft) {
        setValues({ ...EMPTY, ...draft.values });
        setPassport(draft.passport);
        setMedical(draft.medical);
      }
      setRestored(true);
    });
  }, [draftKey]);

  useEffect(() => {
    // Only once the draft has been read, or this would save the empty form
    // over the very draft it was about to restore.
    if (restored) void saveDraft<Draft>(draftKey, { values, passport, medical });
  }, [restored, draftKey, values, passport, medical]);

  const set = <K extends keyof Values>(field: K) => (value: Values[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(({ [field]: _gone, ...rest }) => rest);
  };

  const trackOptions = options?.student.tracks[track];
  const years = useMemo(
    () => ({
      birth: { from: thisYear - 80, to: thisYear - 14 },
      admission: range(thisYear + 1, 2000),
      graduation: [{ value: "", label: "Not sure yet" }, ...range(thisYear, thisYear + 8).map((y) => ({ value: y, label: y }))],
      uew: range(thisYear, 1950),
    }),
    [],
  );

  const attach = async (kind: AttachKind, how: "camera" | "photos" | "document") => {
    if (attaching) return;
    setAttachErrors((current) => ({ ...current, [kind]: undefined }));
    setAttaching({ kind, progress: 0 });
    try {
      const progress = (fraction: number) => setAttaching({ kind, progress: fraction });
      const result =
        how === "camera"
          ? await attachFromCamera(kind, progress)
          : how === "photos"
            ? await attachFromPhotos(kind, progress)
            : await attachDocument(kind, progress);
      // Backed out of the picker: whatever was attached before stays attached.
      if (result) {
        (kind === "passport" ? setPassport : setMedical)(result);
        const field = kind === "passport" ? "profilePicture" : "medicalReportKey";
        setFieldErrors(({ [field]: _gone, ...rest }) => rest);
      }
    } catch (err) {
      setAttachErrors((current) => ({
        ...current,
        [kind]: err instanceof AttachProblem ? err.message : "That file couldn't be attached. Please try again.",
      }));
    } finally {
      setAttaching(null);
    }
  };

  const submit = async () => {
    if (busy || attaching) return;
    setProblem(null);

    const missing: FieldErrors = {};
    if (!passport) missing.profilePicture = ["Please attach your passport picture before continuing."];
    if (!medical) missing.medicalReportKey = ["Please attach your medical report before continuing."];
    if (Object.keys(missing).length > 0) {
      setFieldErrors((current) => ({ ...current, ...missing }));
      const what = [!passport && "your passport picture", !medical && "your medical report"].filter(Boolean).join(" and ");
      setProblem(`Attach ${what} in section 5 first.`);
      return;
    }

    setBusy(true);
    try {
      const response = await api.post<{ ok: true; email: string }>(
        "/join/student",
        {
          track,
          ...values,
          // Optional numbers are left out when blank, not sent as "".
          expectedGraduationYear: values.expectedGraduationYear || undefined,
          uewAlumnus: isPg ? values.uewAlumnus : undefined,
          alumniGraduationYear: isPg && values.uewAlumnus === "yes" ? values.alumniGraduationYear : undefined,
          alumniProgramme: isPg && values.uewAlumnus === "yes" ? values.alumniProgramme : undefined,
          profilePictureToken: passport?.token ?? "",
          medicalReportToken: medical?.token ?? "",
        },
        { open: true },
      );
      await clearDraft(draftKey);
      router.replace({ pathname: "/join/sent", params: { kind: "student", email: response.email } });
    } catch (err) {
      const refused = refusal(err, LABELS);
      setFieldErrors(refused.fieldErrors);
      setProblem(refused.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !options) return <Loading what="the application form" />;
  if (!options || !trackOptions) {
    return <Problem message={optionsError ?? "The application form couldn't be loaded."} onRetry={refresh} />;
  }

  const showForm = !isPg || values.uewAlumnus !== "";
  const fe = fieldErrors;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <Heading>{isPg ? "Postgraduate membership" : "Undergraduate membership"}</Heading>

        {isPg && (
          <Card>
            <RadioGroup
              label="Are you a graduate (alumnus) of the University of Education, Winneba?"
              value={values.uewAlumnus}
              onChange={set("uewAlumnus")}
              error={fe.uewAlumnus}
              required
              options={[
                { value: "yes", label: "Yes, I graduated from UEW", hint: "I completed a programme at UEW before" },
                { value: "no", label: "No", hint: "I haven't graduated from UEW before" },
              ]}
            />
            <Body muted>
              Choose Yes if you completed an earlier programme at UEW. Once this application is approved you&apos;ll
              have dual membership: the Student Portal for your postgraduate studies and the Alumni Portal as a UEW
              graduate, on the same account.
            </Body>
            {values.uewAlumnus === "yes" && (
              <>
                <SelectField
                  label="Year you graduated from UEW"
                  value={values.alumniGraduationYear}
                  options={years.uew}
                  onChange={set("alumniGraduationYear")}
                  error={fe.alumniGraduationYear}
                  required
                />
                <TextField
                  label="Programme you completed at UEW"
                  value={values.alumniProgramme}
                  onChange={set("alumniProgramme")}
                  error={fe.alumniProgramme}
                  placeholder="e.g. BEd Special Education"
                  required
                />
              </>
            )}
          </Card>
        )}

        {showForm && (
          <>
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Before filling in this form, you need to visit the{" "}
                <Text style={styles.strong}>Resource Center for Students with Special Needs</Text>, at the{" "}
                <Text style={styles.strong}>FES Block, Room 104</Text>, to register and be verified as a person with
                special needs.
              </Text>
              <Text style={styles.noticeText}>
                Once your registration has been confirmed there, complete this form. The association team will review
                your details, and an official confirmation will be sent to your personal email address once you are
                approved.
              </Text>
            </View>

            <SectionLabel>1 · Membership type</SectionLabel>
            <Card>
              <SelectField
                label="Membership status"
                value={values.membershipType}
                options={options.student.membershipTypes}
                onChange={set("membershipType")}
                error={fe.membershipType}
                required
              />
            </Card>

            <SectionLabel>2 · Personal identification</SectionLabel>
            <Card style={styles.section}>
              <TextField label="First name" value={values.firstName} onChange={set("firstName")} error={fe.firstName} autoComplete="given-name" required />
              <TextField label="Middle name" value={values.middleName} onChange={set("middleName")} error={fe.middleName} autoComplete="additional-name" />
              <TextField label="Surname" value={values.lastName} onChange={set("lastName")} error={fe.lastName} autoComplete="family-name" required />
              <DateField
                label="Date of birth"
                value={values.dateOfBirth}
                onChange={set("dateOfBirth")}
                error={fe.dateOfBirth}
                fromYear={years.birth.from}
                toYear={years.birth.to}
                required
              />
              <RadioGroup
                label="Gender"
                value={values.gender}
                onChange={set("gender")}
                error={fe.gender}
                required
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                ]}
              />
              <TextField
                label="Personal email address"
                value={values.email}
                onChange={set("email")}
                error={fe.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                placeholder="yourname@gmail.com"
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
            </Card>

            <SectionLabel>3 · UEW campus and academic department</SectionLabel>
            <Card style={styles.section}>
              <SelectField label="UEW campus" value={values.campus} options={options.student.campuses} onChange={set("campus")} error={fe.campus} required />
              <SelectField
                label="Hall of affiliation"
                value={values.hallOfAffiliation}
                options={[{ value: "", label: "None" }, ...options.student.halls.map((h) => ({ value: h, label: h }))]}
                onChange={set("hallOfAffiliation")}
                error={fe.hallOfAffiliation}
              />
              {isPg && (
                <SelectField
                  label="Postgraduate degree category"
                  value={values.degreeCategory}
                  options={trackOptions.degreeCategories}
                  onChange={set("degreeCategory")}
                  error={fe.degreeCategory}
                  required
                />
              )}
              <SelectField
                label="Academic department"
                value={values.academicDepartment}
                options={trackOptions.departments}
                onChange={set("academicDepartment")}
                error={fe.academicDepartment}
                required
              />
              <SelectField
                label="Program of study"
                value={values.programme}
                options={trackOptions.programmes}
                onChange={set("programme")}
                error={fe.programme}
                required
              />
              <SelectField
                label={isPg ? "Year of study" : "Level / year of study"}
                value={values.level}
                options={trackOptions.levels}
                onChange={set("level")}
                error={fe.level}
                required
              />
              <TextField label="Index number" value={values.indexNumber} onChange={set("indexNumber")} error={fe.indexNumber} autoCapitalize="characters" autoCorrect={false} required />
              <SelectField
                label="Year of admission"
                value={values.yearOfAdmission}
                options={years.admission}
                onChange={set("yearOfAdmission")}
                error={fe.yearOfAdmission}
                required
              />
              <SelectField
                label="Expected graduation year"
                value={values.expectedGraduationYear}
                options={years.graduation}
                onChange={set("expectedGraduationYear")}
                error={fe.expectedGraduationYear}
                placeholder="Not sure yet"
              />
            </Card>

            <SectionLabel>4 · Category of special needs</SectionLabel>
            <Card style={styles.section}>
              <SelectField
                label="Category of special needs"
                value={values.department}
                options={options.student.specialNeedsCategories}
                onChange={set("department")}
                error={fe.department}
                required
              />
              <Text style={styles.strong}>Specific support needed on campus</Text>
              {options.student.supportNeeds.map((need) => (
                <CheckField
                  key={need}
                  label={need}
                  checked={values.specificSupportNeeds.includes(need)}
                  onChange={(on) =>
                    set("specificSupportNeeds")(
                      on ? [...values.specificSupportNeeds, need] : values.specificSupportNeeds.filter((n) => n !== need),
                    )
                  }
                />
              ))}
            </Card>

            <SectionLabel>5 · Document attachments</SectionLabel>
            <Card style={styles.section}>
              <FileField
                label="Passport picture"
                hint="A clear, recent passport-sized photo on a plain white background. JPG or PNG, up to 2MB — a photo from the camera is made smaller for you."
                required
                status={passport ? `Attached (${formatBytes(passport.bytes)})` : ""}
                error={fe.profilePicture ?? (attachErrors.passport ? [attachErrors.passport] : undefined)}
                actions={
                  <>
                    {passport?.previewUri && (
                      <Image
                        source={{ uri: passport.previewUri }}
                        style={styles.preview}
                        accessibilityLabel="Your passport picture"
                      />
                    )}
                    <Button label={passport ? "Take a new photo" : "Take a photo"} variant="outline" onPress={() => void attach("passport", "camera")} disabled={Boolean(attaching)} />
                    <Button label="Choose from your photos" variant="outline" onPress={() => void attach("passport", "photos")} disabled={Boolean(attaching)} />
                  </>
                }
              />
              {attaching?.kind === "passport" && (
                <Text accessibilityLiveRegion="polite" style={styles.progress}>
                  Uploading your photo — {Math.round(attaching.progress * 100)}%
                </Text>
              )}

              <FileField
                label="Medical report / disability assessment"
                hint="A saved PDF or Word document, or a clear photo of the paper report. Up to 5MB."
                required
                status={medical ? `Attached: ${medical.name} (${formatBytes(medical.bytes)})` : ""}
                error={fe.medicalReportKey ?? (attachErrors.medical ? [attachErrors.medical] : undefined)}
                actions={
                  <>
                    <Button label="Choose a document" variant="outline" onPress={() => void attach("medical", "document")} disabled={Boolean(attaching)} />
                    <Button label="Take a photo of the report" variant="outline" onPress={() => void attach("medical", "camera")} disabled={Boolean(attaching)} />
                  </>
                }
              />
              {attaching?.kind === "medical" && (
                <Text accessibilityLiveRegion="polite" style={styles.progress}>
                  Uploading your report — {Math.round(attaching.progress * 100)}%
                </Text>
              )}
            </Card>

            <SectionLabel>6 · Additional information</SectionLabel>
            <Card style={styles.section}>
              <TextField label="Residential address" value={values.residentialAddress} onChange={set("residentialAddress")} error={fe.residentialAddress} autoComplete="street-address" required />
              <SelectField label="Region" value={values.region} options={options.student.regions} onChange={set("region")} error={fe.region} required />
              <TextField label="Emergency contact name" value={values.emergencyContactName} onChange={set("emergencyContactName")} error={fe.emergencyContactName} required />
              <TextField
                label="Emergency contact phone"
                value={values.emergencyContactPhone}
                onChange={set("emergencyContactPhone")}
                error={fe.emergencyContactPhone}
                keyboardType="phone-pad"
                required
              />
            </Card>

            <CheckField
              label="I confirm my registration at the Resource Center and that my details are accurate"
              checked={values.agreedToTerms}
              onChange={set("agreedToTerms")}
              error={fe.agreedToTerms}
            >
              <Text style={styles.noticeText}>
                I confirm that I have registered at the Resource Center for Students with Special Needs (FES Block, Room
                104), that all information provided is accurate, and I consent to the association team reviewing my
                details for official acceptance.
              </Text>
            </CheckField>

            <View style={styles.warning}>
              <Text style={styles.warningText}>
                <Text style={styles.strong}>There is no review step after this — check every section above before sending.</Text>{" "}
                Once your application is sent, you can&apos;t edit it yourself. If something needs to change afterwards,
                contact the association directly.
              </Text>
            </View>

            <FormAlert message={problem} />

            <Button
              label={attaching ? "Waiting for your attachment…" : busy ? "Sending…" : "Send my application"}
              busy={busy}
              disabled={Boolean(attaching)}
              onPress={() => void submit()}
            />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
