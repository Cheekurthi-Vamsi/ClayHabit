import type { GradientStops } from './colors';

export type HabitColor = 'purple' | 'blue' | 'pink' | 'mint' | 'amber' | 'cyan';

export interface HabitSwatch {
  /** Solid color for heatmap cells (drawn at stepped opacity per intensity level). */
  base: string;
  gradient: GradientStops;
}

// Keys are stored on saved habits, so they keep their old names; the colours come from the
// app palette. Each gradient ends deep enough for white text, and each base reads as text.
export const habitPalette: Record<HabitColor, HabitSwatch> = {
  purple: { base: '#0A4174', gradient: ['#49769F', '#0A4174'] },
  blue: { base: '#49769F', gradient: ['#6EA2B3', '#49769F'] },
  pink: { base: '#3C84B5', gradient: ['#7BBDE8', '#3C84B5'] },
  mint: { base: '#2F6F82', gradient: ['#4E8EA2', '#2F6F82'] },
  amber: { base: '#6A8A1E', gradient: ['#8FAE22', '#5E7A15'] },
  cyan: { base: '#001D39', gradient: ['#0A4174', '#001D39'] },
};

export const HABIT_COLORS = Object.keys(habitPalette) as HabitColor[];

export function isHabitColor(value: string): value is HabitColor {
  return value in habitPalette;
}

/** Fill opacity for heatmap intensity levels 1–4 (level 0 renders the empty cell color). */
export const HEATMAP_LEVEL_OPACITY = [0, 0.28, 0.5, 0.74, 1] as const;
