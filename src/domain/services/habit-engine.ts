import type { HabitLogMap, WeekdayMask } from '@/domain/entities/habit';
import { addDaysIso as addDays } from '@/utils/date';

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export const EVERY_DAY: WeekdayMask = '1111111';

/** Monday = 0 … Sunday = 6, matching WeekdayMask character order. */
export function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
}

export function isValidWeekdayMask(mask: string): boolean {
  return /^[01]{7}$/.test(mask) && mask.includes('1');
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function describeSchedule(mask: WeekdayMask): string {
  if (mask === '1111111') return 'Every day';
  if (mask === '1111100') return 'Weekdays';
  if (mask === '0000011') return 'Weekends';
  return WEEKDAY_SHORT.filter((_, index) => mask[index] === '1').join(' · ');
}

export function isScheduledOn(mask: WeekdayMask, iso: string): boolean {
  return mask[weekdayIndex(iso)] === '1';
}

export function isCompletedOn(logs: HabitLogMap, target: number, iso: string): boolean {
  return (logs[iso] ?? 0) >= Math.max(1, target);
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  /** Sum of every check-in, including partial days and unscheduled days. */
  totalCheckIns: number;
  /** Days with at least one check-in. */
  activeDays: number;
  /** Days where the daily target was met. */
  completedDays: number;
}

/**
 * Streaks only count *scheduled* days: a Mon/Wed/Fri habit isn't broken by
 * an empty Tuesday. Today is treated as still in progress — not having
 * checked in yet today never breaks a streak, it just isn't counted.
 */
export function computeHabitStats(
  logs: HabitLogMap,
  target: number,
  mask: WeekdayMask,
  todayIso: string,
): HabitStats {
  const loggedDates = Object.keys(logs)
    .filter((date) => date <= todayIso && (logs[date] ?? 0) > 0)
    .sort();

  const totalCheckIns = loggedDates.reduce((sum, date) => sum + (logs[date] ?? 0), 0);
  const activeDays = loggedDates.length;
  const completedDays = loggedDates.filter((date) => isCompletedOn(logs, target, date)).length;

  if (loggedDates.length === 0 || !isValidWeekdayMask(mask)) {
    return { currentStreak: 0, bestStreak: 0, totalCheckIns, activeDays, completedDays };
  }

  const earliest = loggedDates[0];

  let currentStreak = 0;
  let cursor = todayIso;
  if (isScheduledOn(mask, cursor) && !isCompletedOn(logs, target, cursor)) {
    cursor = addDays(cursor, -1);
  }
  while (cursor >= earliest) {
    if (isScheduledOn(mask, cursor)) {
      if (!isCompletedOn(logs, target, cursor)) break;
      currentStreak += 1;
    }
    cursor = addDays(cursor, -1);
  }

  let bestStreak = 0;
  let run = 0;
  for (let date = earliest; date <= todayIso; date = addDays(date, 1)) {
    if (!isScheduledOn(mask, date)) continue;
    if (isCompletedOn(logs, target, date)) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else if (date !== todayIso) {
      run = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    totalCheckIns,
    activeDays,
    completedDays,
  };
}

/** Share of scheduled days in [startIso, endIso] where the target was met. */
export function completionRate(
  logs: HabitLogMap,
  target: number,
  mask: WeekdayMask,
  startIso: string,
  endIso: string,
): number {
  if (!isValidWeekdayMask(mask) || startIso > endIso) return 0;

  let scheduled = 0;
  let completed = 0;
  for (let date = startIso; date <= endIso; date = addDays(date, 1)) {
    if (!isScheduledOn(mask, date)) continue;
    scheduled += 1;
    if (isCompletedOn(logs, target, date)) completed += 1;
  }
  return scheduled === 0 ? 0 : completed / scheduled;
}

/**
 * What one tap on a habit's check button does: add a check-in until the
 * daily target is met, then the next tap clears the day. For a once-a-day
 * habit that's a plain done/undone toggle.
 */
export function nextTapCount(count: number, target: number): number {
  return count >= Math.max(1, target) ? 0 : count + 1;
}

/** Intensity relative to the habit's own daily target (8/8 glasses → 4, 2/8 → 1). */
export function habitLevel(count: number, target: number): HeatmapLevel {
  if (count <= 0) return 0;
  const ratio = Math.min(1, count / Math.max(1, target));
  return Math.max(1, Math.ceil(ratio * 4)) as HeatmapLevel;
}
