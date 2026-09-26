export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceMuted: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryMuted: string;
  onPrimary: string;

  secondary: string;
  secondaryMuted: string;

  /** Lime signal colour (#CFF400): every button, the active nav pill, progress, hero cards. Never text on light. */
  highlight: string;
  /** Pale lime: soft buttons and selected surfaces. */
  highlightMuted: string;
  onHighlight: string;
  /** The dark "ink" panel that anchors a screen (dashboard targets, nav bar). */
  panel: string;
  /** Tiles sitting on the panel. */
  panelMuted: string;
  onPanel: string;
  onPanelMuted: string;

  accentLavender: string;
  accentPurple: string;
  accentBlue: string;
  accentPink: string;
  accentMint: string;
  accentCyan: string;

  /** Finance environment accent (icons, indicators). */
  finance: string;
  financeMuted: string;
  /** Finance accent as text: positive amounts, links. Clears 4.5:1 on the background. */
  financeText: string;
  /** Validated two-series pair for money in vs money out in charts. */
  chartIncome: string;
  chartExpense: string;

  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  error: string;
  errorMuted: string;

  overlay: string;
  shadow: string;
}

export type ColorToken = keyof ThemeColors;

/*
 * ClayHabbit palette (images/Colors.jpg): 001D39 · 0A4174 · 49769F · 4E8EA2 · 6EA2B3 · 7BBDE8 · BDD8E9,
 * plus the lime #CFF400 and the charcoal of images/Dashboard design 3.jpg. Everything else here is a tint or
 * shade of those. The one exception is `error`: a muted red, because a failure has to read as one.
 */
export const lightColors: ThemeColors = {
  background: '#F1F5F8',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#E6EEF4',
  surfacePressed: '#D9E5EE',
  border: '#DCE6EE',
  borderStrong: '#BDD8E9',

  textPrimary: '#001D39',
  textSecondary: '#426D94',
  textTertiary: '#6A8BA3',
  textInverse: '#FFFFFF',

  primary: '#0A4174',
  primaryMuted: '#DDEAF4',
  onPrimary: '#FFFFFF',

  secondary: '#49769F',
  secondaryMuted: '#E3EEF6',

  highlight: '#CFF400',
  highlightMuted: '#EFFBB3',
  onHighlight: '#141512',
  panel: '#001D39',
  panelMuted: '#0A2F53',
  onPanel: '#FFFFFF',
  onPanelMuted: '#BDD8E9',

  accentLavender: '#7BBDE8',
  accentPurple: '#0A4174',
  accentBlue: '#49769F',
  accentPink: '#6EA2B3',
  accentMint: '#4E8EA2',
  accentCyan: '#7BBDE8',

  finance: '#4E8EA2',
  financeMuted: '#E1EEF2',
  financeText: '#2F6F82',
  chartIncome: '#4E8EA2',
  chartExpense: '#001D39',

  success: '#2F6F82',
  successMuted: '#E1EEF2',
  warning: '#6A8A1E',
  warningMuted: '#F2F9D2',
  error: '#C2413F',
  errorMuted: '#F8E4E3',

  overlay: 'rgba(0, 29, 57, 0.4)',
  shadow: 'rgba(0, 29, 57, 0.10)',
};

// Dark mode is Dashboard design 2/3's charcoal, with the palette's light blues for ink and accents.
export const darkColors: ThemeColors = {
  background: '#0E1012',
  backgroundElevated: '#15171A',
  surface: '#18191C',
  surfaceMuted: '#202226',
  surfacePressed: '#2A2C31',
  border: '#26282D',
  borderStrong: '#363940',

  textPrimary: '#F3F7FA',
  textSecondary: '#A9C4D6',
  textTertiary: '#6F8797',
  textInverse: '#001D39',

  primary: '#7BBDE8',
  primaryMuted: '#10263A',
  onPrimary: '#001D39',

  secondary: '#6EA2B3',
  secondaryMuted: '#132A33',

  highlight: '#CFF400',
  highlightMuted: '#2B3305',
  onHighlight: '#141512',
  panel: '#161719',
  panelMuted: '#232529',
  onPanel: '#FFFFFF',
  onPanelMuted: '#A9C4D6',

  accentLavender: '#BDD8E9',
  accentPurple: '#7BBDE8',
  accentBlue: '#49769F',
  accentPink: '#6EA2B3',
  accentMint: '#4E8EA2',
  accentCyan: '#7BBDE8',

  finance: '#6EA2B3',
  financeMuted: '#13282F',
  financeText: '#7BBDE8',
  chartIncome: '#6EA2B3',
  chartExpense: '#CFF400',

  success: '#6EA2B3',
  successMuted: '#13282F',
  warning: '#CFF400',
  warningMuted: '#2A3012',
  error: '#F07C78',
  errorMuted: '#3A1A19',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export type GradientStops = readonly [string, string, ...string[]];

export interface ThemeGradients {
  /** Navy → steel. Primary CTAs, progress fills. */
  primary: GradientStops;
  /** Steel → teal. Focus-related surfaces. */
  secondary: GradientStops;
  /** Midnight → navy. Warm-slot call-to-action cards (habits, notes); the name is historical. */
  lavenderPink: GradientStops;
  /** Teal → navy. Completion and money-in. */
  mintCyan: GradientStops;
  /** Navy → teal. Streaks; the name is historical. */
  pinkPurple: GradientStops;
  /** Midnight → navy → steel. The app's signature gradient. */
  aurora: GradientStops;
  /** Barely-there ice wash for large hero surfaces with dark text on top. */
  heroSoft: GradientStops;
  /** Teal → navy. The finance environment's signature. */
  finance: GradientStops;
}

// Every stop is deep enough for white text on top (>= 3:1 for the bold/large text used on cards).
export const gradients: { light: ThemeGradients; dark: ThemeGradients } = {
  light: {
    primary: ['#0A4174', '#49769F'],
    secondary: ['#49769F', '#2F6F82'],
    lavenderPink: ['#001D39', '#0A4174'],
    mintCyan: ['#2F6F82', '#0A4174'],
    pinkPurple: ['#0A4174', '#2F6F82'],
    aurora: ['#001D39', '#0A4174', '#49769F'],
    heroSoft: ['#DDEAF4', '#EAF2F8', '#F7FAFC'],
    finance: ['#4E8EA2', '#2F6F82', '#0A4174'],
  },
  dark: {
    primary: ['#0A4174', '#2F6F82'],
    secondary: ['#2F6F82', '#0A4174'],
    lavenderPink: ['#0A2F53', '#001D39'],
    mintCyan: ['#2F6F82', '#0A4174'],
    pinkPurple: ['#0A4174', '#2F6F82'],
    aurora: ['#001D39', '#0A4174', '#2F6F82'],
    heroSoft: ['#2A2C31', '#24262A', '#1E2024'],
    finance: ['#2F6F82', '#0A4174', '#001D39'],
  },
};
