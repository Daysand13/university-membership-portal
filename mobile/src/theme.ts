/**
 * Sea blue, and a softer surface than the website's.
 *
 * The website is the association's navy and gold. The app is deliberately
 * lighter — asked for, and it suits a phone: a screen held at arm's length
 * in Ghanaian daylight is easier on the eye in blues than in near-black.
 *
 * Every colour that carries text was chosen against a contrast calculation
 * rather than by eye, and the numbers are in the table below. This
 * association exists for students with special needs; several members read
 * at the largest font size and some have low vision, so a palette that
 * merely looks calm is not good enough — it has to stay legible in sun,
 * through a screen protector, at 200% text.
 *
 * WCAG 2.1 AA wants 4.5:1 for body text. What this palette gives:
 *
 *   body on a card ............ 16.5:1
 *   body on the background .... 14.9:1
 *   muted on a card ............ 6.0:1
 *   headings on a card ......... 8.2:1
 *   label on a primary button .. 5.6:1
 *   header text on the gradient  4.6:1  (at its lightest point)
 *   active tab label ........... 6.5:1
 *
 * `seaLight` is the one colour here that fails against white. It is
 * decoration only — a tint behind an icon, never anything with words on
 * it.
 *
 * Text sizes are plain numbers because React Native scales them by the
 * reader's own font setting, which is the point. Nothing here assumes a
 * line will be one line.
 */

export const colours = {
  /** Headings, and the deep end of the header gradient. */
  primary: "#07547A",
  /** Buttons, links, anything that is tappable and blue. */
  primaryMid: "#0A6E9E",
  /**
   * The light end of the gradient. Not lighter than this: it is the palest
   * sea blue that still carries white text at 4.5:1, and the header's title
   * sits on it.
   */
  primaryLight: "#0F7CB0",
  /** Decoration only. Never put text on this. */
  seaLight: "#5FB7E6",

  accent: "#E8A33D",
  ink: "#16202B",
  slate: "#53657A",
  slateLight: "#7D8FA3",
  line: "#DAE7F1",
  surface: "#FFFFFF",
  /** The screen behind the cards — a blue so pale it reads as warmth. */
  surfaceMuted: "#EDF5FB",
  /** The bar along the bottom. */
  tabBar: "#0E2E44",
  /**
   * An unselected tab's label. Dimmer than the selected one but still at
   * 6.6:1 against the bar — "inactive" should not mean "unreadable", and
   * the tab someone wants is often the one they are not on.
   */
  tabInactive: "#9DB4C6",

  success: "#0F7A50",
  successLight: "#E3F4EC",
  warning: "#8A5A00",
  warningLight: "#FBF0DC",
  danger: "#A81F16",
  dangerLight: "#FBE9E7",
  white: "#FFFFFF",
} as const;

/** The header gradient, deep to light, as expo-linear-gradient wants it. */
export const HEADER_GRADIENT = [colours.primary, colours.primaryLight] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Generous corners. This is most of what "soft" turns out to mean in
 * practice — a 6px corner reads as a box, an 18px one reads as a card.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Shadows, kept shallow.
 *
 * Android renders these through `elevation`, which also darkens edges, so
 * a shadow heavy enough to notice on its own looks like grime around every
 * card. Cards keep a hairline border as well: a shadow alone is invisible
 * to somebody with low vision, and the border is what tells them where one
 * card stops and the next begins.
 */
export const shadow = {
  card: {
    shadowColor: "#0A3A56",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#07547A",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const type = {
  title: 24,
  heading: 19,
  subheading: 16,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

/**
 * The smallest a control may be.
 *
 * 48dp is Android's own guidance, and it is not a nicety here: a member
 * with a tremor, or one reading at the largest font size, cannot hit a
 * 32dp button reliably. Buttons are given more than this — the minimum is
 * a floor, not a target.
 */
export const TOUCH_TARGET = 48;
