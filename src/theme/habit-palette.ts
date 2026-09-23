import type { GradientStops } from './colors';

export type HabitColor = 'purple' | 'blue' | 'pink' | 'mint' | 'amber' | 'cyan';

export interface HabitSwatch {
  /** Solid color for heatmap cells (drawn at stepped opacity per intensity level). */
  base: string;
  gradient: GradientStops;
}

export const habitPalette: Record<HabitColor, HabitSwatch> = {
  purple: { base: '#6F57F2', gradient: ['#9C8CF8', '#6F57F2'] },
  blue: { base: '#3A74E6', gradient: ['#6FA3F7', '#3A74E6'] },
  // Kept as a key for saved habits; now a soft rose rather than hot pink.
  pink: { base: '#DC5F84', gradient: ['#F2A3B9', '#DC5F84'] },
  mint: { base: '#1FA985', gradient: ['#7FDCC2', '#1FA985'] },
  amber: { base: '#E08A12', gradient: ['#F7C66B', '#E08A12'] },
  cyan: { base: '#1792C4', gradient: ['#74CDEB', '#1792C4'] },
};

export const HABIT_COLORS = Object.keys(habitPalette) as HabitColor[];

export function isHabitColor(value: string): value is HabitColor {
  return value in habitPalette;
}

/** Fill opacity for heatmap intensity levels 1–4 (level 0 renders the empty cell color). */
export const HEATMAP_LEVEL_OPACITY = [0, 0.28, 0.5, 0.74, 1] as const;
