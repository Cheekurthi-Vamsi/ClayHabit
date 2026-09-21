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

export const lightColors: ThemeColors = {
  background: '#F7F8FC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2F8',
  surfacePressed: '#E8EAF4',
  border: '#ECEDF4',
  borderStrong: '#D9DBE8',

  textPrimary: '#171821',
  textSecondary: '#7C7F8A',
  textTertiary: '#A6A9B6',
  textInverse: '#FFFFFF',

  primary: '#6C63FF',
  primaryMuted: '#EEEDFF',
  onPrimary: '#FFFFFF',

  secondary: '#6ED7FF',
  secondaryMuted: '#E6F8FF',

  accentLavender: '#A78BFA',
  accentPurple: '#8B7CFF',
  accentBlue: '#4F9DFF',
  accentPink: '#F472B6',
  accentMint: '#8FE3CF',
  accentCyan: '#6ED7FF',

  success: '#2EBD85',
  successMuted: '#E3F7EF',
  warning: '#F5A524',
  warningMuted: '#FEF3DD',
  error: '#F0526B',
  errorMuted: '#FDE6EA',

  overlay: 'rgba(23, 24, 33, 0.35)',
  shadow: 'rgba(76, 70, 160, 0.10)',
};

export const darkColors: ThemeColors = {
  background: '#0B0B14',
  backgroundElevated: '#13131F',
  surface: '#171726',
  surfaceMuted: '#1F1F33',
  surfacePressed: '#292942',
  border: '#262640',
  borderStrong: '#34345A',

  textPrimary: '#F5F5FA',
  textSecondary: '#A3A5BF',
  textTertiary: '#6E7091',
  textInverse: '#171821',

  primary: '#8B84FF',
  primaryMuted: '#25224A',
  onPrimary: '#FFFFFF',

  secondary: '#6ED7FF',
  secondaryMuted: '#10303F',

  accentLavender: '#B9A3FF',
  accentPurple: '#9D90FF',
  accentBlue: '#74B4FF',
  accentPink: '#F78CC6',
  accentMint: '#8FE3CF',
  accentCyan: '#6ED7FF',

  success: '#3FD99A',
  successMuted: '#0F3326',
  warning: '#FFB94D',
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
  lavenderPink: GradientStops;
  mintCyan: GradientStops;
  /** Pink → purple. Streak card. */
  pinkPurple: GradientStops;
  /** Pink → purple → blue. The app's signature gradient (center + button). */
  aurora: GradientStops;
  /** Barely-there blue/purple wash for large hero surfaces with dark text on top. */
  heroSoft: GradientStops;
}

export const gradients: { light: ThemeGradients; dark: ThemeGradients } = {
  light: {
    primary: ['#8B7CFF', '#65C7FF'],
    secondary: ['#4F9DFF', '#6ED7FF'],
    lavenderPink: ['#C4B5FD', '#F9A8D4'],
    mintCyan: ['#8FE3CF', '#6ED7FF'],
    pinkPurple: ['#F472B6', '#8B7CFF'],
    aurora: ['#F472B6', '#A78BFA', '#65C7FF'],
    heroSoft: ['#EEEBFF', '#F5EEFF', '#E6F5FF'],
  },
  dark: {
    primary: ['#7B6CF5', '#4FA9E8'],
    secondary: ['#3F83E0', '#4FBFE3'],
    lavenderPink: ['#8E78E0', '#D877AE'],
    mintCyan: ['#4FB89F', '#4FBFE3'],
    pinkPurple: ['#D9579C', '#7B6CF5'],
    aurora: ['#D9579C', '#8E78E0', '#4FA9E8'],
    heroSoft: ['#1C1936', '#221A39', '#142336'],
  },
};
