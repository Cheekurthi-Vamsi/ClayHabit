export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export type TypographyVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'titleLarge'
  | 'titleMedium'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'caption';

interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const typography: Record<TypographyVariant, TextStyleToken> = {
  displayLarge: { fontFamily: fontFamily.extraBold, fontSize: 34, lineHeight: 41, letterSpacing: -0.5 },
  displayMedium: { fontFamily: fontFamily.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  headlineLarge: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  headlineMedium: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.1 },
  titleLarge: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  titleMedium: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  labelLarge: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  labelMedium: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
};
