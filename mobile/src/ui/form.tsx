import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "../a11y/preferences";
import { ReadableDialog, useSpeakable } from "../a11y/reading";
import { describeControl } from "../a11y/speech-words";
import { ReadAloudButton } from "../a11y/A11yControls";
import { radius, spacing, TOUCH_TARGET } from "../theme";
import { Text } from "./Text";
import { Button } from "./components";

/**
 * The controls a sign-up form is made of.
 *
 * Each one has a visible label above it — never a placeholder standing in
 * for one, which vanishes the moment somebody starts typing — and puts its
 * own error directly under it, where somebody who has just filled it in is
 * looking. Each says itself to TalkBack with its role and state, and to
 * Read Aloud in the website's words: "Surname, text box, empty, required."
 */

type ViewInstance = React.ComponentRef<typeof View>;
type InputInstance = React.ComponentRef<typeof TextInput>;

const useStyles = makeStyles((t) => ({
  field: { gap: spacing.xs },
  label: { fontSize: t.type.body, fontWeight: "700", color: t.colours.ink, lineHeight: t.type.body * 1.4 },
  required: { color: t.colours.danger },
  hint: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
  error: { fontSize: t.type.small, color: t.colours.danger, lineHeight: t.type.small * 1.5, fontWeight: "600" },
  input: {
    minHeight: TOUCH_TARGET + 4,
    borderWidth: t.highContrast ? 2.5 : 1.5,
    borderColor: t.colours.lineStrong,
    borderRadius: radius.md,
    backgroundColor: t.colours.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: t.type.body,
    color: t.colours.ink,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top", paddingTop: spacing.md },
  inputError: { borderColor: t.colours.danger, borderWidth: 2.5 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  selectValue: { fontSize: t.type.body, color: t.colours.ink, flex: 1 },
  selectPlaceholder: { fontSize: t.type.body, color: t.colours.placeholder, flex: 1 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  datePart: { flexGrow: 1, flexBasis: 90 },
  check: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: t.highContrast ? 2.5 : 1.5,
    borderColor: t.colours.line,
    backgroundColor: t.colours.surface,
  },
  checkOn: { borderColor: t.colours.accentText, backgroundColor: t.colours.surfacePressed },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colours.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    backgroundColor: t.colours.surface,
  },
  boxOn: { backgroundColor: t.colours.button, borderColor: t.colours.button },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: t.colours.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  dotOn: { borderColor: t.colours.button },
  dotInner: { width: 13, height: 13, borderRadius: 7, backgroundColor: t.colours.button },
  checkText: { flex: 1, gap: 2 },
  checkLabel: { fontSize: t.type.body, color: t.colours.ink, fontWeight: "600", lineHeight: t.type.body * 1.4 },
  backdrop: { flex: 1, backgroundColor: t.colours.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: t.colours.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "85%",
    paddingTop: spacing.lg,
    borderWidth: t.highContrast ? 2 : 0,
    borderColor: t.colours.line,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  sheetTitle: { flex: 1, fontSize: t.type.heading, fontWeight: "700", color: t.colours.heading },
  search: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  option: {
    minHeight: TOUCH_TARGET + 4,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: t.highContrast ? 1.5 : 1,
    borderBottomColor: t.colours.line,
  },
  optionOn: { backgroundColor: t.colours.surfacePressed },
  optionText: { flex: 1, fontSize: t.type.body, color: t.colours.ink, lineHeight: t.type.body * 1.4 },
  sheetFooter: { padding: spacing.xl, paddingTop: spacing.md },
  formAlert: {
    backgroundColor: t.colours.dangerBg,
    borderRadius: radius.md,
    borderWidth: t.border,
    borderColor: t.colours.danger,
    padding: spacing.lg,
  },
  formAlertText: { fontSize: t.type.body, color: t.colours.danger, fontWeight: "600", lineHeight: t.type.body * 1.45 },
}));

function Label({ text, required, nativeID }: { text: string; required?: boolean; nativeID?: string }) {
  const styles = useStyles();
  return (
    <Text speak={false} nativeID={nativeID} style={styles.label}>
      {text}
      {/* "required" is said in words by the control; the star is for sighted readers. */}
      {required && (
        <Text speak={false} style={styles.required} accessibilityElementsHidden importantForAccessibility="no">
          {" *"}
        </Text>
      )}
    </Text>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  const styles = useStyles();
  if (!messages || messages.length === 0) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {messages[0]}
    </Text>
  );
}

/** A message for the whole form. Said by TalkBack the moment it appears. */
export function FormAlert({ message }: { message?: string | null }) {
  const styles = useStyles();
  if (!message) return null;
  return (
    <View style={styles.formAlert}>
      <Text accessibilityRole="alert" style={styles.formAlertText}>
        {message}
      </Text>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  secret,
  multiline,
  ...input
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  hint?: string;
  required?: boolean;
  /** A password. Read Aloud says "filled in" rather than reading it out. */
  secret?: boolean;
  multiline?: boolean;
} & Omit<TextInputProps, "value" | "onChange" | "onChangeText" | "secureTextEntry" | "multiline">) {
  const styles = useStyles();
  const theme = useTheme();
  const spoken = secret ? (value ? "filled in" : "") : value;
  const ref = useSpeakable<InputInstance>(
    `${describeControl({ kind: "textbox", name: label, value: spoken, required })}`,
  );

  return (
    <View style={styles.field}>
      <Label text={label} required={required} />
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secret}
        multiline={multiline}
        accessibilityLabel={required ? `${label}, required` : label}
        accessibilityHint={hint}
        placeholderTextColor={theme.colours.placeholder}
        style={[styles.input, multiline && styles.inputMultiline, error?.length ? styles.inputError : null]}
        {...input}
      />
      <FieldError messages={error} />
    </View>
  );
}

export interface Choice {
  value: string;
  label: string;
}

/**
 * A dropdown. Android has no native one a screen reader handles well, so
 * this is a button that opens a list — searchable once the list is long
 * enough that scrolling it would be a chore, which the programmes of study
 * are.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  required,
  placeholder = "Choose…",
}: {
  label: string;
  value: string;
  options: (string | Choice)[];
  onChange: (value: string) => void;
  error?: string[];
  hint?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const choices = useMemo<Choice[]>(
    () => options.map((option) => (typeof option === "string" ? { value: option, label: option } : option)),
    [options],
  );
  const chosen = choices.find((choice) => choice.value === value);
  const searchable = choices.length > 12;
  const shown = query.trim()
    ? choices.filter((choice) => choice.label.toLowerCase().includes(query.trim().toLowerCase()))
    : choices;

  const ref = useSpeakable<ViewInstance>(
    `${describeControl({ kind: "select", name: label, value: chosen?.label ?? "", required })}`,
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.field}>
      <Label text={label} required={required} />
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <Pressable
        ref={ref}
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}${required ? ", required" : ""}. ${chosen ? chosen.label : "Nothing chosen yet"}`}
        accessibilityHint="Opens the list of choices"
        accessibilityState={{ expanded: open }}
        style={[styles.input, styles.select, error?.length ? styles.inputError : null]}
      >
        <Text speak={false} style={chosen ? styles.selectValue : styles.selectPlaceholder}>
          {chosen ? chosen.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colours.muted} />
      </Pressable>
      <FieldError messages={error} />

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <ReadableDialog open={open}>
          <View style={styles.backdrop}>
            <View style={styles.sheet} accessibilityViewIsModal>
              <View style={styles.sheetHeader}>
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  {label}
                </Text>
                <ReadAloudButton tone="sheet" />
              </View>
              {searchable && (
                <View style={styles.search}>
                  <TextField
                    label="Search the list"
                    value={query}
                    onChange={setQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              )}
              <FlatList
                data={shown}
                keyExtractor={(choice) => choice.value}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                renderItem={({ item }) => (
                  <Option
                    choice={item}
                    chosen={item.value === value}
                    onChoose={() => {
                      onChange(item.value);
                      close();
                    }}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.option}>
                    <Text style={styles.optionText}>Nothing matches that.</Text>
                  </View>
                }
              />
              <View style={styles.sheetFooter}>
                <Button label="Close" variant="outline" onPress={close} />
              </View>
            </View>
          </View>
        </ReadableDialog>
      </Modal>
    </View>
  );
}

function Option({ choice, chosen, onChoose }: { choice: Choice; chosen: boolean; onChoose: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const ref = useSpeakable<ViewInstance>(describeControl({ kind: "radio", name: choice.label, checked: chosen }));
  return (
    <Pressable
      ref={ref}
      onPress={onChoose}
      accessibilityRole="radio"
      accessibilityLabel={choice.label}
      accessibilityState={{ checked: chosen }}
      style={({ pressed }) => [styles.option, (chosen || pressed) && styles.optionOn]}
    >
      <Text speak={false} style={styles.optionText}>
        {choice.label}
      </Text>
      {chosen && <Ionicons name="checkmark" size={22} color={theme.colours.accentText} />}
    </Pressable>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A date, as day, month and year — three short lists rather than a
 * calendar, which is a grid of tiny targets that TalkBack reads one day at
 * a time. Value is "YYYY-MM-DD", or "" until all three are chosen.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  required,
  fromYear,
  toYear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  required?: boolean;
  fromYear: number;
  toYear: number;
}) {
  const styles = useStyles();
  const [initialYear, initialMonth, initialDay] = value ? value.split("-") : ["", "", ""];
  const [parts, setParts] = useState({ day: initialDay ?? "", month: initialMonth ?? "", year: initialYear ?? "" });

  // A value that arrives after this first appears — a draft restored once
  // the form is already on screen, after the camera — has to show up here
  // too, or the date of birth would be the one box left empty.
  useEffect(() => {
    if (!value) return;
    const [year = "", month = "", day = ""] = value.split("-");
    setParts((current) =>
      current.year === year && current.month === month && current.day === day ? current : { day, month, year },
    );
  }, [value]);

  const update = (change: Partial<typeof parts>) => {
    const next = { ...parts, ...change };
    setParts(next);
    onChange(next.day && next.month && next.year ? `${next.year}-${next.month}-${next.day}` : "");
  };

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = MONTHS.map((name, i) => ({ value: String(i + 1).padStart(2, "0"), label: name }));
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(toYear - i));

  return (
    <View style={styles.field} accessibilityLabel={label}>
      <Label text={label} required={required} />
      <View style={styles.dateRow}>
        <View style={styles.datePart}>
          <SelectField label={`${label}: day`} value={parts.day} options={days} onChange={(day) => update({ day })} placeholder="Day" />
        </View>
        <View style={[styles.datePart, { flexBasis: 140 }]}>
          <SelectField
            label={`${label}: month`}
            value={parts.month}
            options={months}
            onChange={(month) => update({ month })}
            placeholder="Month"
          />
        </View>
        <View style={styles.datePart}>
          <SelectField label={`${label}: year`} value={parts.year} options={years} onChange={(year) => update({ year })} placeholder="Year" />
        </View>
      </View>
      <FieldError messages={error} />
    </View>
  );
}

/** A tick box, with the whole row as the target, not the little square. */
export function CheckField({
  label,
  checked,
  onChange,
  error,
  hint,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string[];
  hint?: string;
  /** Longer wording, shown in place of the label (a consent statement, say). */
  children?: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const ref = useSpeakable<ViewInstance>(
    `${describeControl({ kind: "checkbox", name: label, checked })}`,
  );

  return (
    <View style={styles.field}>
      <Pressable
        ref={ref}
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ checked }}
        style={[styles.check, checked && styles.checkOn]}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked && <Ionicons name="checkmark" size={18} color={theme.colours.onButton} />}
        </View>
        <View style={styles.checkText}>
          {children ?? (
            <Text speak={false} style={styles.checkLabel}>
              {label}
            </Text>
          )}
          {hint && (
            <Text speak={false} style={styles.hint}>
              {hint}
            </Text>
          )}
        </View>
      </Pressable>
      <FieldError messages={error} />
    </View>
  );
}

/** One choice from a few, all visible at once. */
export function RadioGroup({
  label,
  value,
  options,
  onChange,
  error,
  required,
}: {
  label: string;
  value: string;
  options: (Choice & { hint?: string })[];
  onChange: (value: string) => void;
  error?: string[];
  required?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label text={label} required={required} />
      <View style={{ gap: spacing.sm }}>
        {options.map((option) => (
          <RadioOption key={option.value} option={option} chosen={value === option.value} onChoose={() => onChange(option.value)} />
        ))}
      </View>
      <FieldError messages={error} />
    </View>
  );
}

function RadioOption({ option, chosen, onChoose }: { option: Choice & { hint?: string }; chosen: boolean; onChoose: () => void }) {
  const styles = useStyles();
  const ref = useSpeakable<ViewInstance>(
    `${describeControl({ kind: "radio", name: option.label, checked: chosen })}${option.hint ? ` ${option.hint}.` : ""}`,
  );
  return (
    <Pressable
      ref={ref}
      onPress={onChoose}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityHint={option.hint}
      accessibilityState={{ checked: chosen }}
      style={[styles.check, chosen && styles.checkOn]}
    >
      <View style={[styles.dot, chosen && styles.dotOn]}>{chosen && <View style={styles.dotInner} />}</View>
      <View style={styles.checkText}>
        <Text speak={false} style={styles.checkLabel}>
          {option.label}
        </Text>
        {option.hint && (
          <Text speak={false} style={styles.hint}>
            {option.hint}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Attaching a file. What happens on a press is the screen's business — a
 * camera or a document picker — this is the label, the state and the
 * message, said the same way everywhere.
 */
export function FileField({
  label,
  hint,
  required,
  status,
  error,
  actions,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** "Attached: report.pdf (1.2MB)", or "" when nothing is yet. */
  status: string;
  error?: string[];
  actions: ReactNode;
}) {
  const styles = useStyles();
  const ref = useSpeakable<ViewInstance>(
    `${describeControl({ kind: "file", name: label, value: status, required })}`,
  );
  return (
    <View ref={ref} style={styles.field}>
      <Label text={label} required={required} />
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={{ gap: spacing.sm }}>{actions}</View>
      {status ? (
        <Text speak={false} accessibilityLiveRegion="polite" style={styles.hint}>
          {status}
        </Text>
      ) : null}
      <FieldError messages={error} />
    </View>
  );
}
