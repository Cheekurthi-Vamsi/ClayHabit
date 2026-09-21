export const radii = {
  sm: 10,
  md: 16,
  /** Cards and bento tiles. */
  lg: 22,
  /** Buttons and sheets. */
  xl: 28,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
