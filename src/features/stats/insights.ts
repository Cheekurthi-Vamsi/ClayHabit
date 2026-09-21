import type { HabitWithLogs } from '@/domain/entities/habit';
import { isCompletedOn, isScheduledOn, weekdayIndex } from '@/domain/services/habit-engine';
import { addDaysIso, toLocalIsoDate } from '@/utils/date';

type Counts = Record<string, number>;

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function sumRange(counts: Counts, startIso: string, endIso: string): number {
  let total = 0;
  for (let date = startIso; date <= endIso; date = addDaysIso(date, 1)) {
    total += counts[date] ?? 0;
  }
  return total;
}

/** Percent change, or null when there's no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Weekday name with the most activity over the `weeks` weeks ending on `endIso`. */
export function bestWeekday(counts: Counts, endIso: string, weeks = 8): string | null {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const start = addDaysIso(endIso, -(weeks * 7 - 1));
  for (let date = start; date <= endIso; date = addDaysIso(date, 1)) {
    totals[weekdayIndex(date)] += counts[date] ?? 0;
  }
  const max = Math.max(...totals);
  return max > 0 ? WEEKDAY_NAMES[totals.indexOf(max)] : null;
}

/** Most common hour of the day, or null with no data. Ties resolve to the earlier hour. */
export function peakHour(hours: number[]): number | null {
  if (hours.length === 0) return null;
  const buckets = new Array<number>(24).fill(0);
  for (const hour of hours) buckets[hour] += 1;
  return buckets.indexOf(Math.max(...buckets));
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

/** Share of scheduled habit-days met across every habit in the range (skipping days before a habit existed). */
export function habitsCompletionRate(
  habits: HabitWithLogs[],
  startIso: string,
  endIso: string,
): number | null {
  let scheduled = 0;
  let completed = 0;
  for (const habit of habits) {
    const createdOn = toLocalIsoDate(new Date(habit.createdAt));
    for (let date = startIso; date <= endIso; date = addDaysIso(date, 1)) {
      if (date < createdOn || !isScheduledOn(habit.daysOfWeek, date)) continue;
      scheduled += 1;
      if (isCompletedOn(habit.logs, habit.targetPerDay, date)) completed += 1;
    }
  }
  return scheduled === 0 ? null : completed / scheduled;
}
