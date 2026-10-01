/**
 * How the app looks, for each way somebody has asked to see it.
 *
 * Pure data and arithmetic, with no React Native import, so the tests can
 * hold every palette to its contrast floor. The hooks that hand a theme to
 * a screen live in src/a11y/preferences.tsx.
 *
 * The website offers dark mode, high contrast and three text sizes, and so
 * does the app — the same choices, in the same words. Each combination is a
 * palette here, chosen against a contrast calculation rather than by eye,
 * and tests/theme.test.ts holds every one of them to its floor: 4.5:1 for
 * text in the ordinary palettes, 7:1 in the high-contrast ones, and 3:1 for
 * the edge of anything you can type into.
 *
 * This association exists for students with special needs. Several members
 * read at the largest size, some have low vision, and a phone is used in
 * Ghanaian daylight through a scratched screen protector — so a palette
 * that merely looks calm is not good enough.
 *
 * Colours are named for what they do, not for what they are. "heading"
 * rather than "primary": in dark mode the heading is a pale blue and the
 * button behind white text is a deep one, and one name for both would be
 * wrong in one mode or the other.
 */

export interface Palette {
  /** The screen behind the cards. */
  background: string;
  /** Cards, sheets, text boxes. */
  surface: string;
  /** Pressed card. */
  surfacePressed: string;
  /** A card's edge. Decoration; the shadow and spacing also separate cards. */
  line: string;
  /** The edge of a control — a text box, a tick box. Held to 3:1. */
  lineStrong: string;

  ink: string;
  muted: string;
  placeholder: string;
  heading: string;
  /** Links, the label of an outline button, a chosen option. */
  accentText: string;

  button: string;
  buttonPressed: string;
  onButton: string;

  headerFrom: string;
  /** The light end of the header gradient. Still carries a white title. */
  headerTo: string;
  onHeader: string;

  tabBar: string;
  tabActive: string;
  tabInactive: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;

  /** Behind an icon, never behind words. */
  decoration: string;
  /** Behind a dialog. */
  overlay: string;
  white: string;
}

const light: Palette = {
  background: "#EDF5FB",
  surface: "#FFFFFF",
  surfacePressed: "#E3EEF7",
  line: "#DAE7F1",
  lineStrong: "#7D8FA3",
  ink: "#16202B",
  muted: "#53657A",
  placeholder: "#6E8094",
  heading: "#07547A",
  accentText: "#0A6E9E",
  button: "#0A6E9E",
  buttonPressed: "#07547A",
  onButton: "#FFFFFF",
  headerFrom: "#07547A",
  headerTo: "#0F7CB0",
  onHeader: "#FFFFFF",
  tabBar: "#0E2E44",
  tabActive: "#E8A33D",
  tabInactive: "#9DB4C6",
  success: "#0F7A50",
  successBg: "#E3F4EC",
  warning: "#8A5A00",
  warningBg: "#FBF0DC",
  danger: "#A81F16",
  dangerBg: "#FBE9E7",
  decoration: "#5FB7E6",
  overlay: "rgba(7, 32, 48, 0.6)",
  white: "#FFFFFF",
};

const dark: Palette = {
  background: "#0B1822",
  surface: "#12232F",
  surfacePressed: "#1A3242",
  line: "#2A4253",
  lineStrong: "#6C8BA0",
  ink: "#E8F0F5",
  muted: "#A9BCCB",
  placeholder: "#8EA3B4",
  heading: "#8ED0F2",
  accentText: "#8ED0F2",
  button: "#0A6E9E",
  buttonPressed: "#07547A",
  onButton: "#FFFFFF",
  headerFrom: "#07547A",
  headerTo: "#0F7CB0",
  onHeader: "#FFFFFF",
  tabBar: "#06121A",
  tabActive: "#E8A33D",
  tabInactive: "#9DB4C6",
  success: "#6FD3A2",
  successBg: "#12352A",
  warning: "#F2C077",
  warningBg: "#3A2C10",
  danger: "#FF9A90",
  dangerBg: "#3D1714",
  decoration: "#1F5E80",
  overlay: "rgba(0, 0, 0, 0.7)",
  white: "#FFFFFF",
};

/** Stronger text and edges. What the website's High contrast switch does. */
const lightContrast: Palette = {
  ...light,
  background: "#FFFFFF",
  surfacePressed: "#DCE8F2",
  line: "#4B5B6B",
  lineStrong: "#1F2A36",
  ink: "#000000",
  muted: "#1F2A36",
  placeholder: "#4B5B6B",
  heading: "#033B57",
  accentText: "#033B57",
  button: "#054564",
  buttonPressed: "#032F45",
  headerFrom: "#022E44",
  headerTo: "#054564",
  tabBar: "#03111A",
  tabActive: "#FFC766",
  tabInactive: "#E6EEF4",
  success: "#0A5A3A",
  warning: "#5C3C00",
  danger: "#7E140D",
};

const darkContrast: Palette = {
  ...dark,
  background: "#000000",
  surface: "#0A0F14",
  surfacePressed: "#16222C",
  line: "#9FB3C4",
  lineStrong: "#E6EEF4",
  ink: "#FFFFFF",
  muted: "#E0E8EE",
  placeholder: "#B8C7D3",
  heading: "#A8DCF7",
  accentText: "#A8DCF7",
  button: "#054564",
  buttonPressed: "#032F45",
  headerFrom: "#022E44",
  headerTo: "#054564",
  tabBar: "#000000",
  tabActive: "#FFC766",
  tabInactive: "#E6EEF4",
  success: "#8FE3B9",
  successBg: "#0F2A20",
  warning: "#FFD58A",
  warningBg: "#2E2208",
  danger: "#FFB3AB",
  dangerBg: "#2E100D",
};

export const PALETTES = { light, dark, lightContrast, darkContrast } as const;

export type TextSize = "standard" | "large" | "larger";

/** The website's three sizes, as a multiplier. Three, not a slider: a slider is hard with a tremor. */
export const TEXT_SCALE: Record<TextSize, number> = { standard: 1, large: 1.15, larger: 1.3 };

export interface DisplayPreferences {
  textSize: TextSize;
  highContrast: boolean;
  dark: boolean;
}

export const DEFAULT_PREFERENCES: DisplayPreferences = { textSize: "standard", highContrast: false, dark: false };

const BASE_TYPE = {
  title: 24,
  heading: 19,
  subheading: 16,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Generous corners: most of what "soft" turns out to mean. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * The smallest a control may be. 48dp is Android's own guidance, and not a
 * nicety here: a member with a tremor cannot hit a 32dp button reliably.
 */
export const TOUCH_TARGET = 48;

export interface Theme {
  colours: Palette;
  type: Record<keyof typeof BASE_TYPE, number>;
  /** 1 normally, 2 in high contrast — a hairline is the first thing low vision loses. */
  border: number;
  dark: boolean;
  highContrast: boolean;
  textSize: TextSize;
  shadow: {
    card: object;
    raised: object;
  };
}

export function buildTheme(preferences: DisplayPreferences): Theme {
  const colours = preferences.dark
    ? preferences.highContrast
      ? darkContrast
      : dark
    : preferences.highContrast
      ? lightContrast
      : light;
  const scale = TEXT_SCALE[preferences.textSize];
  const type = Object.fromEntries(
    Object.entries(BASE_TYPE).map(([name, size]) => [name, Math.round(size * scale)]),
  ) as Theme["type"];

  // Android renders shadows through elevation, which darkens edges; shallow
  // ones keep it soft. In dark mode a shadow is invisible anyway, and the
  // border does the work.
  const card = preferences.dark
    ? { elevation: 0, shadowOpacity: 0 }
    : { shadowColor: "#0A3A56", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
  const raised = preferences.dark
    ? { elevation: 0, shadowOpacity: 0 }
    : { shadowColor: "#07547A", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 };

  return {
    colours,
    type,
    border: preferences.highContrast ? 2 : 1,
    dark: preferences.dark,
    highContrast: preferences.highContrast,
    textSize: preferences.textSize,
    shadow: { card, raised },
  };
}
