/**
 * The association's colours, as the website uses them.
 *
 * Copied deliberately rather than guessed: the app and the website are the
 * same organisation, and a member moving between them should not feel they
 * have gone somewhere else.
 *
 * Text sizes are plain numbers because React Native scales them by the
 * reader's own font setting — which is the point. Nothing here assumes a
 * line will be one line.
 */

export const colours = {
  primary: "#14153D",
  primaryLight: "#2A2B63",
  accent: "#C9A227",
  ink: "#161C28",
  slate: "#5B6478",
  slateLight: "#8792A6",
  line: "#E1E6EF",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F7FB",
  success: "#1B8A5A",
  successLight: "#E6F5EE",
  warning: "#A66A00",
  warningLight: "#FDF3E2",
  danger: "#B3261E",
  dangerLight: "#FBEAE8",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
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
 * 32dp button reliably.
 */
export const TOUCH_TARGET = 48;
