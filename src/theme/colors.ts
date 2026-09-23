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
 * ClayHabbit palette, taken from the brand art in images/: the logo's violet → blue,
 * the illustration's mint leaves and peach sun, and deep navy ink for text.
 * Pink is now only a small accent (habit colour), not the signature.
 */
export const lightColors: ThemeColors = {
  background: '#F7F8FC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F2F9',
  surfacePressed: '#E5E8F3',
  border: '#E6E8F1',
  borderStrong: '#CDD2E2',

  // Navy ink, not grey-black: matches the headline colour in the brand art.
  textPrimary: '#1B2140',
  textSecondary: '#5B6380',
  textTertiary: '#8C93AD',
  textInverse: '#FFFFFF',

  primary: '#5B4FE8',
  primaryMuted: '#ECEAFF',
  onPrimary: '#FFFFFF',

  secondary: '#2F7BE8',
  secondaryMuted: '#E4EFFD',

  accentLavender: '#9C8CF8',
  accentPurple: '#7258F5',
  accentBlue: '#3E7BEA',
  accentPink: '#E86F92',
  accentMint: '#27B893',
  accentCyan: '#1B9ED0',

  finance: '#12A38C',
  financeMuted: '#E3F6F2',
  financeText: '#0A7A70',
  chartIncome: '#1BAF7A',
  chartExpense: '#EB6834',

  success: '#1FA97A',
  successMuted: '#E1F6EE',
  warning: '#E08A12',
  warningMuted: '#FEF1DC',
  error: '#E0445E',
  errorMuted: '#FCE5E9',

  overlay: 'rgba(27, 33, 64, 0.38)',
  shadow: 'rgba(40, 46, 110, 0.10)',
};

export const darkColors: ThemeColors = {
  background: '#0D1020',
  backgroundElevated: '#141830',
  surface: '#181D36',
  surfaceMuted: '#1F2542',
  surfacePressed: '#29304F',
  border: '#262C4A',
  borderStrong: '#363E63',

  textPrimary: '#F2F3FA',
  textSecondary: '#A7ADC8',
  textTertiary: '#737A99',
  textInverse: '#1B2140',

  primary: '#8C82FF',
  primaryMuted: '#25234D',
  onPrimary: '#FFFFFF',

  secondary: '#5FA2F5',
  secondaryMuted: '#132A48',

  accentLavender: '#B4A8FF',
  accentPurple: '#9A88FF',
  accentBlue: '#6FA3F7',
  accentPink: '#F28FAE',
  accentMint: '#4FD3B0',
  accentCyan: '#4CC2EA',

  finance: '#3CCFB6',
  financeMuted: '#0F2E2A',
  financeText: '#4FD1C0',
  chartIncome: '#199E70',
  chartExpense: '#D95926',

  success: '#3FD19E',
  successMuted: '#0F3326',
  warning: '#FFB54A',
  warningMuted: '#3A2C10',
  error: '#FF6F86',
  errorMuted: '#3B1620',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export type GradientStops = readonly [string, string, ...string[]];

export interface ThemeGradients {
  /** Purple → blue. Primary CTAs, progress fills, active nav indicator. */
  primary: GradientStops;
  /** Blue → cyan. Focus-related surfaces. */
  secondary: GradientStops;
  /** Clay: burnt orange → terracotta. Warm call-to-action cards (habits, notes). */
  lavenderPink: GradientStops;
  /** Mint → ocean. Completion and money-in. */
  mintCyan: GradientStops;
  /** Amber → ember. Streaks (fire). */
  pinkPurple: GradientStops;
  /** Violet → indigo → blue, from the logo. The app's signature gradient. */
  aurora: GradientStops;
  /** Barely-there blue/purple wash for large hero surfaces with dark text on top. */
  heroSoft: GradientStops;
  /** Mint → teal → blue. The finance environment's signature (white text clears 3:1 on every stop). */
  finance: GradientStops;
}

// Every stop is deep enough for white text on top (≥ 3:1 for the bold/large text used on cards).
export const gradients: { light: ThemeGradients; dark: ThemeGradients } = {
  light: {
    primary: ['#6F57F2', '#3A74E6'],
    secondary: ['#3A6FE0', '#1685BF'],
    lavenderPink: ['#DB7440', '#C24E43'],
    mintCyan: ['#119C80', '#1780BD'],
    pinkPurple: ['#D86F1B', '#CF4638'],
    aurora: ['#7258F5', '#5561EC', '#3A74E6'],
    heroSoft: ['#EEEFFF', '#F2F0FF', '#E8F3FE'],
    finance: ['#12A38C', '#0F8C84', '#2B6FD0'],
  },
  dark: {
    primary: ['#6450E6', '#2F66D6'],
    secondary: ['#2F5FCC', '#12739F'],
    lavenderPink: ['#C0612F', '#A83F37'],
    mintCyan: ['#0E826B', '#136B9E'],
    pinkPurple: ['#C9681A', '#B23A2E'],
    aurora: ['#6450E6', '#4A55D8', '#2F66D6'],
    heroSoft: ['#1A1C3A', '#1D1B3B', '#132640'],
    finance: ['#0E8272', '#0B6E69', '#2459A8'],
  },
};
