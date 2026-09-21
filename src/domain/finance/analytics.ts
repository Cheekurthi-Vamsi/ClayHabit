import type { CategoryColor, CategoryTotal, MonthKey, TypeTotals } from './entities';
import { EMPTY_TOTALS } from './entities';
import { percentDelta } from './ledger';
import { addMonths, formatMonthLabel } from './month';

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
 * Average monthly spending over the complete months in `flows` (all but the
 * last, which is still in progress) that had any activity. Null until there
 * is at least one such month — a new user has no "average" yet.
 */
export function averageMonthlySpend(flows: readonly MonthFlow[]): number | null {
  const complete = flows.slice(0, -1).filter((flow) => flow.expense > 0 || flow.income > 0);
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
