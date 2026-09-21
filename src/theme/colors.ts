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
  surfaceMuted: '#F0F1F7',
  surfacePressed: '#E6E8F5',
  border: '#E3E5F0',
  borderStrong: '#CFD2E8',

  textPrimary: '#14152B',
  textSecondary: '#6B6F8D',
  textTertiary: '#9A9DB8',
  textInverse: '#FFFFFF',

  primary: '#6C5CE7',
  primaryMuted: '#EFEBFF',
  onPrimary: '#FFFFFF',

  secondary: '#3E8BFF',
  secondaryMuted: '#E7F1FF',

  accentLavender: '#B79CFF',
  accentMint: '#22C79A',
  accentCyan: '#22B8D0',

  success: '#2FAF6E',
  successMuted: '#E4F7ED',
  warning: '#E39A1B',
  warningMuted: '#FCF1DC',
  error: '#E9535A',
  errorMuted: '#FCE7E8',

  overlay: 'rgba(20, 21, 43, 0.4)',
  shadow: 'rgba(30, 32, 67, 0.12)',
};

export const darkColors: ThemeColors = {
  background: '#0D0E1A',
  backgroundElevated: '#15162A',
  surface: '#181A31',
  surfaceMuted: '#20223D',
  surfacePressed: '#282B4C',
  border: '#2B2E4C',
  borderStrong: '#383C63',

  textPrimary: '#F4F4FB',
  textSecondary: '#A7AAC9',
  textTertiary: '#71749B',
  textInverse: '#14152B',

  primary: '#A594FF',
  primaryMuted: '#292352',
  onPrimary: '#14152B',

  secondary: '#6FB6FF',
  secondaryMuted: '#1B2C4D',

  accentLavender: '#C9B6FF',
  accentMint: '#3FE0AE',
  accentCyan: '#3FCFE6',

  success: '#3FD98C',
  successMuted: '#153826',
  warning: '#FFB94D',
  warningMuted: '#3A2C10',
  error: '#FF7A7E',
  errorMuted: '#3B1B1D',

  overlay: 'rgba(2, 3, 12, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export interface ThemeGradients {
  primary: readonly [string, string];
  secondary: readonly [string, string];
  lavenderPink: readonly [string, string];
  mintCyan: readonly [string, string];
}

export const gradients: { light: ThemeGradients; dark: ThemeGradients } = {
  light: {
    primary: ['#7C6CF5', '#3E8BFF'],
    secondary: ['#3E8BFF', '#22B8D0'],
    lavenderPink: ['#B79CFF', '#FF9CC7'],
    mintCyan: ['#22C79A', '#22B8D0'],
  },
  dark: {
    primary: ['#8B7BFF', '#5FA6FF'],
    secondary: ['#5FA6FF', '#3FCFE6'],
    lavenderPink: ['#C9B6FF', '#FFA9D6'],
    mintCyan: ['#3FE0AE', '#3FCFE6'],
  },
};
