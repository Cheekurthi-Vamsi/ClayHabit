import type { HabitColor } from '@/theme/habit-palette';

/**
 * Seven characters, Monday first: '1' = scheduled that day.
 * '1111111' is every day, '1111100' is weekdays only.
 */
export type WeekdayMask = string;

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: HabitColor;
  targetPerDay: number;
  daysOfWeek: WeekdayMask;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Check-in counts keyed by local YYYY-MM-DD date. */
export type HabitLogMap = Record<string, number>;

export interface HabitWithLogs extends Habit {
  logs: HabitLogMap;
}

export interface NewHabitInput {
  name: string;
  emoji: string;
  color: HabitColor;
  targetPerDay?: number;
  daysOfWeek?: WeekdayMask;
}

export interface UpdateHabitInput {
  name?: string;
  emoji?: string;
  color?: HabitColor;
  targetPerDay?: number;
  daysOfWeek?: WeekdayMask;
}
