import type { MonthKey } from './entities';
import {
  addMonths,
  addMonthsToDate,
  daysBetween,
  formatDayLabel,
  formatMonthLabel,
  monthEnd,
  monthKeyOf,
  monthStart,
} from './month';

/**
 * The span the Stats screen looks at: one calendar month, one calendar year,
 * or everything ever recorded. Like month.ts this works on local
 * `YYYY-MM-DD` strings only.
 */

export type StatsScope = 'month' | 'year' | 'all';

export type StatsPeriod = { scope: 'month'; month: MonthKey } | { scope: 'year'; year: number } | { scope: 'all' };

export interface DayRange {
  /** Local days, inclusive. */
  from: string;
  to: string;
}

export interface PeriodRange extends DayRange {
  /** Today falls inside the period, so its figures are "so far". */
  inProgress: boolean;
}

/** The months with records, oldest first — what the period stepper may move between. */
export interface PeriodBounds {
  firstMonth: MonthKey;
  lastMonth: MonthKey;
}

export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export function yearStart(year: number): string {
  return `${String(year).padStart(4, '0')}-01-01`;
}

export function yearEnd(year: number): string {
  return `${String(year).padStart(4, '0')}-12-31`;
}

/** January to December of `year`. */
export function monthsOfYear(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, index) => addMonths(`${String(year).padStart(4, '0')}-01`, index));
}

/** Every month from `first` to `last` inclusive, oldest first. */
export function monthsBetween(first: MonthKey, last: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);
  return months;
}

/** Days in [from, to], inclusive. */
export function dayCount(range: DayRange): number {
  return Math.max(0, daysBetween(range.from, range.to) + 1);
}

/** The period that holds `today`, at the given scope. */
export function currentPeriod(scope: StatsScope, today: string): StatsPeriod {
  if (scope === 'month') return { scope, month: monthKeyOf(today) };
  if (scope === 'year') return { scope, year: yearOf(today) };
  return { scope };
}

/**
 * The days a period covers, clipped at today (nothing can be recorded in the
 * future). All time starts at the first record, or today when there is none.
 */
export function periodRange(period: StatsPeriod, today: string, firstDay: string | null): PeriodRange {
  const [start, end] =
    period.scope === 'month'
      ? [monthStart(period.month), monthEnd(period.month)]
      : period.scope === 'year'
        ? [yearStart(period.year), yearEnd(period.year)]
        : [firstDay && firstDay < today ? firstDay : today, today];
  return { from: start, to: end < today ? end : today, inProgress: start <= today && today <= end };
}

/**
 * What a period is measured against. An unfinished one compares like for like
 * with the same span of the one before (Sep 1–22 against Aug 1–22, or Jan 1 –
 * Sep 22 against the same days last year); a finished one against the whole
 * previous month or year. All time has nothing before it.
 */
export function comparisonRange(period: StatsPeriod, today: string): (DayRange & { label: string }) | null {
  if (period.scope === 'all') return null;

  if (period.scope === 'month') {
    const previous = addMonths(period.month, -1);
    const inProgress = monthKeyOf(today) === period.month;
    if (!inProgress) return { from: monthStart(previous), to: monthEnd(previous), label: formatMonthLabel(previous) };
    // Clamps to the end of a shorter month: Mar 31 compares against all of February.
    const to = addMonthsToDate(today, -1);
    return { from: monthStart(previous), to, label: `${formatDayLabel(monthStart(previous))}–${Number(to.slice(8, 10))}` };
  }

  const previous = period.year - 1;
  if (yearOf(today) !== period.year) return { from: yearStart(previous), to: yearEnd(previous), label: String(previous) };
  // Feb 29 compares against Feb 28 of the year before.
  const to = addMonthsToDate(today, -12);
  return { from: yearStart(previous), to, label: `Jan 1 – ${formatDayLabel(to)}, ${previous}` };
}

/** "September 2026", "2026", or "All time". */
export function periodLabel(period: StatsPeriod): string {
  if (period.scope === 'month') return formatMonthLabel(period.month);
  if (period.scope === 'year') return String(period.year);
  return 'All time';
}

/** The month or year `delta` steps away. All time has no neighbours. */
export function shiftPeriod(period: StatsPeriod, delta: number): StatsPeriod {
  if (period.scope === 'month') return { scope: 'month', month: addMonths(period.month, delta) };
  if (period.scope === 'year') return { scope: 'year', year: period.year + delta };
  return period;
}

/** Whether stepping by `delta` stays within the months that have records. */
export function canShift(period: StatsPeriod, delta: number, bounds: PeriodBounds): boolean {
  if (period.scope === 'all') return false;
  const next = shiftPeriod(period, delta);
  if (next.scope === 'month') return next.month >= bounds.firstMonth && next.month <= bounds.lastMonth;
  if (next.scope === 'year') {
    return next.year >= yearOf(monthStart(bounds.firstMonth)) && next.year <= yearOf(monthStart(bounds.lastMonth));
  }
  return false;
}

/** Brings a period back inside the bounds (e.g. after the oldest record is deleted). */
export function clampPeriod(period: StatsPeriod, bounds: PeriodBounds): StatsPeriod {
  if (period.scope === 'month') {
    const month =
      period.month < bounds.firstMonth ? bounds.firstMonth : period.month > bounds.lastMonth ? bounds.lastMonth : period.month;
    return month === period.month ? period : { scope: 'month', month };
  }
  if (period.scope === 'year') {
    const first = yearOf(monthStart(bounds.firstMonth));
    const last = yearOf(monthStart(bounds.lastMonth));
    const year = Math.min(last, Math.max(first, period.year));
    return year === period.year ? period : { scope: 'year', year };
  }
  return period;
}
