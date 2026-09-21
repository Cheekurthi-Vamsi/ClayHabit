import { addDaysIso } from '@/utils/date';

import type { MonthKey } from './entities';

/**
 * Calendar-month helpers working purely on local `YYYY-MM-DD` / `YYYY-MM`
 * strings, never `toISOString()` (which shifts dates across UTC — see
 * utils/date.ts). Months are calendar months for now; a custom month start
 * (salary day) can slot in here later without touching callers.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseMonth(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonth(key);
  // Day 0 of the next month is the last day of this one; leap years come for free.
  return new Date(year, month, 0).getDate();
}

export function monthStart(key: MonthKey): string {
  return `${key}-01`;
}

export function monthEnd(key: MonthKey): string {
  return `${key}-${pad(daysInMonth(key))}`;
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonth(key);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Every date of the month, oldest first, optionally stopping at `through` (inclusive). */
export function datesInMonth(key: MonthKey, through?: string): string[] {
  const dates: string[] = [];
  const last = through && through < monthEnd(key) ? through : monthEnd(key);
  for (let date = monthStart(key); date <= last; date = addDaysIso(date, 1)) {
    dates.push(date);
  }
  return dates;
}

/** "September 2026", or "Sep" when `short`. */
export function formatMonthLabel(key: MonthKey, short = false): string {
  const { year, month } = parseMonth(key);
  const name = MONTH_NAMES[month - 1];
  return short ? name.slice(0, 3) : `${name} ${year}`;
}

/** "Sep 21". */
export function formatDayLabel(isoDate: string): string {
  return `${MONTH_NAMES[Number(isoDate.slice(5, 7)) - 1].slice(0, 3)} ${Number(isoDate.slice(8, 10))}`;
}

/**
 * The same span of last month as has passed of this one — e.g. on Sep 21,
 * Aug 1–Aug 21 — so "spent so far" compares like with like. Clipped at the
 * end of a shorter month (Mar 31 compares against all of February).
 */
export function samePointLastMonth(todayIso: string): { start: string; end: string } {
  const previous = addMonths(monthKeyOf(todayIso), -1);
  const day = Math.min(Number(todayIso.slice(8, 10)), daysInMonth(previous));
  return { start: monthStart(previous), end: `${previous}-${pad(day)}` };
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). DST-safe. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Full calendar months from `fromIso` until `toIso`: Sep 21 → Mar 21 is 6,
 * Sep 21 → Mar 20 is 5. Never negative.
 */
export function wholeMonthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}

/** Adds calendar months to a date, clamping to the end of shorter months (Jan 31 + 1 → Feb 28/29). */
export function addMonthsToDate(isoDate: string, delta: number): string {
  const key = addMonths(monthKeyOf(isoDate), delta);
  const day = Math.min(Number(isoDate.slice(8, 10)), daysInMonth(key));
  return `${key}-${pad(day)}`;
}
