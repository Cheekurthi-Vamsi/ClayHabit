export const radii = {
  sm: 10,
  md: 18,
  /** Cards and bento tiles. */
  lg: 26,
  /** Buttons and sheets. */
  xl: 30,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
