export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  /** Source Serif 4: the Notes editor's headings, where an editorial serif suits long writing. */
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
  // Headings: heavy geometric sans, as in the dashboard designs. The serif stays for Notes.
  displayLarge: { fontFamily: fontFamily.extraBold, fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  displayMedium: { fontFamily: fontFamily.extraBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  headlineLarge: { fontFamily: fontFamily.bold, fontSize: 25, lineHeight: 31, letterSpacing: -0.5 },
  headlineMedium: { fontFamily: fontFamily.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  titleLarge: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  titleMedium: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMedium: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  labelLarge: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  labelMedium: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  caption: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
};
