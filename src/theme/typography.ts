export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  /**
   * Headings: Source Serif 4, bundled so it looks the same everywhere. It sits in the
   * "Anthropic Serif", Georgia, "Times New Roman", serif family of editorial serifs.
   */
  serifRegular: 'SourceSerif4_400Regular',
  serifMedium: 'SourceSerif4_500Medium',
  serifSemiBold: 'SourceSerif4_600SemiBold',
  serifBold: 'SourceSerif4_700Bold',
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
  // Headings are serif; everything people read in bulk or tap stays in Manrope.
  displayLarge: { fontFamily: fontFamily.serifSemiBold, fontSize: 36, lineHeight: 43, letterSpacing: -0.6 },
  displayMedium: { fontFamily: fontFamily.serifSemiBold, fontSize: 30, lineHeight: 37, letterSpacing: -0.4 },
  headlineLarge: { fontFamily: fontFamily.serifSemiBold, fontSize: 25, lineHeight: 32, letterSpacing: -0.3 },
  headlineMedium: { fontFamily: fontFamily.serifSemiBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  titleLarge: { fontFamily: fontFamily.serifSemiBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.1 },
  titleMedium: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  labelLarge: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  labelMedium: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
};
