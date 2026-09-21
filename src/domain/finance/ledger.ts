import type { CategoryTotal, TransactionType, TypeTotals } from './entities';

/**
 * The money model. Balances are never stored — they're derived from the
 * opening balance plus every recorded transaction, so editing or removing a
 * record can't leave a stale running total behind:
 *
 *   available = opening + income + withdrawals from savings
 *               − expenses − savings set aside − transfers out
 */

/** How one transaction moves the spendable balance. */
export function balanceEffect(type: TransactionType, amountMinor: number): number {
  return type === 'income' || type === 'withdrawal' ? amountMinor : -amountMinor;
}

/** Net change to the spendable balance across a set of totals. */
export function netChange(totals: TypeTotals): number {
  return totals.income + totals.withdrawal - totals.expense - totals.saving - totals.transfer;
}

/** What sits in savings plans: everything set aside minus everything taken back. */
export function savedInPlans(totals: TypeTotals): number {
  return totals.saving - totals.withdrawal;
}

export function availableBalance(openingMinor: number, allTime: TypeTotals): number {
  return openingMinor + netChange(allTime);
}

export interface MonthSummary {
  income: number;
  expense: number;
  saving: number;
  withdrawal: number;
  transfer: number;
  /** Balance on the first of the month, before any of its transactions. */
  startBalance: number;
  /** Balance after every transaction recorded in the month so far. */
  endBalance: number;
  /** Change to the spendable balance over the month. */
  net: number;
  /**
   * Income not spent or transferred away — including anything explicitly set
   * aside as savings, since that money was kept, not spent. Moving money in
   * and out of savings plans doesn't change it.
   */
  kept: number;
  /** Net amount put into savings plans this month. */
  setAside: number;
  /** `kept / income`, or null with no income to measure against. */
  savingsRate: number | null;
}

/**
 * @param openingMinor the account's opening balance
 * @param beforeMonth totals of every transaction dated before the month
 * @param month totals of the month's transactions
 */
export function summarizeMonth(openingMinor: number, beforeMonth: TypeTotals, month: TypeTotals): MonthSummary {
  const startBalance = availableBalance(openingMinor, beforeMonth);
  const net = netChange(month);
  const kept = month.income - month.expense - month.transfer;
  return {
    ...month,
    startBalance,
    endBalance: startBalance + net,
    net,
    kept,
    setAside: savedInPlans(month),
    savingsRate: month.income > 0 ? kept / month.income : null,
  };
}

/**
 * End-of-day balance for each date, oldest first, starting from `startMinor`
 * and applying each day's net change.
 */
export function dailyBalances(
  startMinor: number,
  netByDay: Readonly<Record<string, number>>,
  dates: readonly string[],
): number[] {
  let running = startMinor;
  return dates.map((date) => {
    running += netByDay[date] ?? 0;
    return running;
  });
}

/** Percent change, or null when there's no baseline. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface CategoryBreakdown {
  items: (CategoryTotal & { share: number })[];
  /** Everything past `limit`, folded together so the list stays readable. */
  other: { totalMinor: number; count: number; categories: number; share: number } | null;
  totalMinor: number;
}

/** Categories by spend, largest first; the tail beyond `limit` folds into "Other". */
export function breakdownByCategory(totals: readonly CategoryTotal[], limit = 5): CategoryBreakdown {
  const sorted = [...totals]
    .filter((item) => item.totalMinor > 0)
    .sort((a, b) => b.totalMinor - a.totalMinor || a.name.localeCompare(b.name));
  const totalMinor = sorted.reduce((sum, item) => sum + item.totalMinor, 0);
  const share = (value: number) => (totalMinor > 0 ? value / totalMinor : 0);

  // Folding a single category into "Other" hides its name for nothing, so show it instead.
  const cut = sorted.length > limit + 1 ? limit : sorted.length;
  const items = sorted.slice(0, cut).map((item) => ({ ...item, share: share(item.totalMinor) }));
  const tail = sorted.slice(cut);
  const tailTotal = tail.reduce((sum, item) => sum + item.totalMinor, 0);

  return {
    items,
    other:
      tail.length > 0
        ? {
            totalMinor: tailTotal,
            count: tail.reduce((sum, item) => sum + item.count, 0),
            categories: tail.length,
            share: share(tailTotal),
          }
        : null,
    totalMinor,
  };
}
