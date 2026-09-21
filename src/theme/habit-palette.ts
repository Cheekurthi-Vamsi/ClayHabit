import type { GradientStops } from './colors';

export type HabitColor = 'purple' | 'blue' | 'pink' | 'mint' | 'amber' | 'cyan';

export interface HabitSwatch {
  /** Solid color for heatmap cells (drawn at stepped opacity per intensity level). */
  base: string;
  gradient: GradientStops;
}

export const habitPalette: Record<HabitColor, HabitSwatch> = {
  purple: { base: '#7C6CFF', gradient: ['#A78BFA', '#6C63FF'] },
  blue: { base: '#3E8BFF', gradient: ['#65C7FF', '#3E8BFF'] },
  pink: { base: '#EC4899', gradient: ['#F9A8D4', '#EC4899'] },
  mint: { base: '#14B892', gradient: ['#8FE3CF', '#14B892'] },
  amber: { base: '#F59E0B', gradient: ['#FCD34D', '#F59E0B'] },
  cyan: { base: '#06AED4', gradient: ['#6ED7FF', '#06AED4'] },
};

export const HABIT_COLORS = Object.keys(habitPalette) as HabitColor[];

export function isHabitColor(value: string): value is HabitColor {
  return value in habitPalette;
}

/** Fill opacity for heatmap intensity levels 1–4 (level 0 renders the empty cell color). */
export const HEATMAP_LEVEL_OPACITY = [0, 0.28, 0.5, 0.74, 1] as const;
