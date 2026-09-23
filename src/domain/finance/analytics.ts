import type { CategoryColor, CategoryTotal, MonthKey, PaymentMethod, TypeTotals } from './entities';
import { EMPTY_TOTALS, PAYMENT_METHODS } from './entities';
import { netChange, percentDelta } from './ledger';
import { addMonths, daysBetween, formatMonthLabel } from './month';

export interface MonthFlow {
  month: MonthKey;
  /** "Sep". */
  label: string;
  income: number;
  expense: number;
  /** income − expense: what the month added to (or took from) savings capacity. */
  net: number;
}

/** The `count` months ending with `lastMonth`, oldest first, zero-filled. */
export function monthFlows(
  byMonth: Readonly<Record<MonthKey, TypeTotals>>,
  lastMonth: MonthKey,
  count: number,
): MonthFlow[] {
  const flows: MonthFlow[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const month = addMonths(lastMonth, -offset);
    const totals = byMonth[month] ?? EMPTY_TOTALS;
    flows.push({
      month,
      label: formatMonthLabel(month, true),
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    });
  }
  return flows;
}

/**
 * Average monthly spending over the complete months in `flows` that had any
 * activity — all but the last, unless `lastInProgress` is false (a past
 * year). Null until there is at least one such month — a new user has no
 * "average" yet.
 */
export function averageMonthlySpend(flows: readonly MonthFlow[], lastInProgress = true): number | null {
  const complete = (lastInProgress ? flows.slice(0, -1) : flows).filter((flow) => flow.expense > 0 || flow.income > 0);
  if (complete.length === 0) return null;
  return Math.round(complete.reduce((sum, flow) => sum + flow.expense, 0) / complete.length);
}

export interface CategoryChange {
  categoryId: string | null;
  name: string;
  emoji: string;
  color: CategoryColor;
  currentMinor: number;
  previousMinor: number;
  /** Percent change, or null when the category had no spending before. */
  delta: number | null;
}

/** This period's biggest categories, each compared with the previous period. */
export function categoryChanges(
  current: readonly CategoryTotal[],
  previous: readonly CategoryTotal[],
  limit = 5,
): CategoryChange[] {
  const before = new Map(previous.map((total) => [total.categoryId, total.totalMinor]));
  return [...current]
    .filter((total) => total.totalMinor > 0)
    .sort((a, b) => b.totalMinor - a.totalMinor)
    .slice(0, limit)
    .map((total) => {
      const previousMinor = before.get(total.categoryId) ?? 0;
      return {
        categoryId: total.categoryId,
        name: total.name,
        emoji: total.emoji,
        color: total.color,
        currentMinor: total.totalMinor,
        previousMinor,
        delta: percentDelta(total.totalMinor, previousMinor),
      };
    });
}

// ---- multi-period analytics ------------------------------------------------

export interface PeriodSummary {
  income: number;
  expense: number;
  /** income − expense. */
  net: number;
  /** Income not spent or transferred away (savings set aside count as kept). */
  kept: number;
  /** Net amount put into savings plans. */
  setAside: number;
  /** `kept / income`, or null with no income to measure against. */
  savingsRate: number | null;
}

/** The headline figures for any span, from its totals per type. */
export function summarizePeriod(totals: TypeTotals): PeriodSummary {
  const kept = totals.income - totals.expense - totals.transfer;
  return {
    income: totals.income,
    expense: totals.expense,
    net: totals.income - totals.expense,
    kept,
    setAside: totals.saving - totals.withdrawal,
    savingsRate: totals.income > 0 ? kept / totals.income : null,
  };
}

/** Adds totals together, type by type. */
export function sumTotals(list: readonly TypeTotals[]): TypeTotals {
  const sum: TypeTotals = { ...EMPTY_TOTALS };
  for (const totals of list) {
    sum.income += totals.income;
    sum.expense += totals.expense;
    sum.saving += totals.saving;
    sum.withdrawal += totals.withdrawal;
    sum.transfer += totals.transfer;
  }
  return sum;
}

export interface YearSummary extends PeriodSummary {
  year: number;
  /** Months in the year with any income or spending. */
  activeMonths: number;
}

/** One summary per calendar year from `firstYear` to `lastYear`, newest first, zero-filled. */
export function yearSummaries(
  byMonth: Readonly<Record<MonthKey, TypeTotals>>,
  firstYear: number,
  lastYear: number,
): YearSummary[] {
  const years: YearSummary[] = [];
  for (let year = lastYear; year >= firstYear; year--) {
    const prefix = `${String(year).padStart(4, '0')}-`;
    const months = Object.entries(byMonth).filter(([month]) => month.startsWith(prefix));
    years.push({
      year,
      ...summarizePeriod(sumTotals(months.map(([, totals]) => totals))),
      activeMonths: months.filter(([, totals]) => totals.income > 0 || totals.expense > 0).length,
    });
  }
  return years;
}

/**
 * The balance after each month, oldest first: `startMinor` plus every
 * month's net change to the spendable balance so far.
 */
export function monthEndBalances(
  startMinor: number,
  byMonth: Readonly<Record<MonthKey, TypeTotals>>,
  months: readonly MonthKey[],
): number[] {
  let running = startMinor;
  return months.map((month) => {
    running += netChange(byMonth[month] ?? EMPTY_TOTALS);
    return running;
  });
}

/** Running totals: [3, 0, 2] → [3, 3, 5]. */
export function cumulative(values: readonly number[]): number[] {
  let running = 0;
  return values.map((value) => (running += value));
}

/**
 * Average spending on each weekday, Monday first. `bySqlWeekday` is indexed
 * like SQLite's strftime('%w') (0 = Sunday); each total is divided by how many
 * of that weekday fall in [from, to], so a range that happens to hold five
 * Fridays and four Sundays still compares fairly.
 */
export function weekdayAverages(bySqlWeekday: readonly number[], from: string, to: string): number[] {
  const days = daysBetween(from, to) + 1;
  if (days <= 0) return [0, 0, 0, 0, 0, 0, 0];
  const firstWeekday = new Date(`${from}T00:00:00`).getDay();
  const fullWeeks = Math.floor(days / 7);
  const extra = days % 7;

  const averages: number[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const sqlWeekday = (offset + 1) % 7; // Monday first
    // The leftover days run on from the first weekday of the range.
    const occurrences = fullWeeks + ((sqlWeekday - firstWeekday + 7) % 7 < extra ? 1 : 0);
    averages.push(occurrences > 0 ? Math.round((bySqlWeekday[sqlWeekday] ?? 0) / occurrences) : 0);
  }
  return averages;
}

/**
 * Heatmap intensity by rank among the days that had any spending: the top
 * quarter is level 4, the bottom quarter level 1. Ranking (rather than
 * dividing by the biggest day) keeps one rent payment from washing every
 * other day out to the palest step.
 */
export function rankLevels(values: readonly number[]): (value: number) => 0 | 1 | 2 | 3 | 4 {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  const n = sorted.length;
  return (value) => {
    if (value <= 0 || n === 0) return 0;
    // How many recorded days were at or below this one (upper bound, by binary search).
    let low = 0;
    let high = n;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (sorted[mid] <= value) low = mid + 1;
      else high = mid;
    }
    return Math.min(4, Math.max(1, Math.ceil((4 * low) / n))) as 1 | 2 | 3 | 4;
  };
}

/** The flow with the highest `pick`, among those with any activity. Earliest wins a tie. */
export function peakFlow<T extends { income: number; expense: number }>(
  flows: readonly T[],
  pick: (flow: T) => number,
): T | null {
  let best: T | null = null;
  for (const flow of flows) {
    if (flow.income === 0 && flow.expense === 0) continue;
    if (!best || pick(flow) > pick(best)) best = flow;
  }
  return best;
}

export interface PaymentShare {
  /** A payment method key, or null for payments recorded without one. */
  method: PaymentMethod | null;
  label: string;
  totalMinor: number;
  count: number;
  share: number;
}

/** Spending per payment method, largest first. */
export function paymentShares(
  rows: readonly { method: PaymentMethod | null; totalMinor: number; count: number }[],
): PaymentShare[] {
  const total = rows.reduce((sum, row) => sum + row.totalMinor, 0);
  return rows
    .filter((row) => row.totalMinor > 0)
    .map((row) => ({
      ...row,
      label: row.method ? (PAYMENT_METHODS.find((method) => method.key === row.method)?.label ?? 'Other') : 'Not set',
      share: total > 0 ? row.totalMinor / total : 0,
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor || a.label.localeCompare(b.label));
}
