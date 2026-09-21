import type { HabitWithLogs } from '@/domain/entities/habit';
import { isCompletedOn, isScheduledOn, weekdayIndex } from '@/domain/services/habit-engine';
import { addDaysIso, toLocalIsoDate } from '@/utils/date';

type Counts = Record<string, number>;

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
export function peakHour(hours: readonly number[]): number | null {
  if (hours.length === 0) return null;
  const buckets = new Array<number>(24).fill(0);
  for (const hour of hours) buckets[hour] += 1;
  return buckets.indexOf(Math.max(...buckets));
}

/** Completions per hour of the day, index 0 = midnight. */
export function hourBuckets(hours: readonly number[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const hour of hours) {
    if (hour >= 0 && hour < 24) buckets[hour] += 1;
  }
  return buckets;
}

export interface DayPart {
  key: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  count: number;
}

/** Morning 5–11, afternoon 12–16, evening 17–20, night 21–4. */
export function dayParts(hours: readonly number[]): DayPart[] {
  const parts: DayPart[] = [
    { key: 'morning', label: 'Morning', count: 0 },
    { key: 'afternoon', label: 'Afternoon', count: 0 },
    { key: 'evening', label: 'Evening', count: 0 },
    { key: 'night', label: 'Night', count: 0 },
  ];
  for (const hour of hours) {
    if (hour >= 5 && hour < 12) parts[0].count += 1;
    else if (hour >= 12 && hour < 17) parts[1].count += 1;
    else if (hour >= 17 && hour < 21) parts[2].count += 1;
    else parts[3].count += 1;
  }
  return parts;
}

/** One value per day for the `days` days ending on `endIso`, oldest first. */
export function dailySeries(
  counts: Counts,
  endIso: string,
  days: number,
): { dates: string[]; values: number[] } {
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    dates.push(addDaysIso(endIso, -offset));
  }
  return { dates, values: dates.map((date) => counts[date] ?? 0) };
}

/** Average activity per weekday (Monday first) over the `weeks` full weeks ending on `endIso`. */
export function weekdayAverages(counts: Counts, endIso: string, weeks: number): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const start = addDaysIso(endIso, -(weeks * 7 - 1));
  for (let date = start; date <= endIso; date = addDaysIso(date, 1)) {
    totals[weekdayIndex(date)] += counts[date] ?? 0;
  }
  return totals.map((total) => total / weeks);
}

export function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Index of the largest value, or null when every value is zero. Ties resolve to the first. */
export function indexOfMax(values: readonly number[]): number | null {
  const max = Math.max(0, ...values);
  return max > 0 ? values.indexOf(max) : null;
}

/** 95 → "1h 35m", 40 → "40m". */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
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
