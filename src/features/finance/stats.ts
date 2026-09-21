import type { SQLiteDatabase } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import {
  averageMonthlySpend,
  categoryChanges,
  monthFlows,
  type CategoryChange,
  type MonthFlow,
} from '@/domain/finance/analytics';
import type { CategoryTotal, FinTransactionView, MonthKey } from '@/domain/finance/entities';
import { addMonths, monthKeyOf, monthStart, samePointLastMonth } from '@/domain/finance/month';

export const STATS_MONTHS = 6;

export interface FinanceStats {
  currency: string;
  monthKey: MonthKey;
  /** Six months, oldest first; the last is this month so far. */
  months: MonthFlow[];
  /** This month's spending divided by the days elapsed. */
  averageDailySpend: number;
  averageMonthlySpend: number | null;
  largestExpense: FinTransactionView | null;
  topCategory: CategoryTotal | null;
  /** This month's biggest categories vs the same days of last month. */
  changes: CategoryChange[];
}

export async function loadFinanceStats(db: SQLiteDatabase, today: string): Promise<FinanceStats> {
  const monthKey = monthKeyOf(today);
  const start = monthStart(monthKey);
  const previous = samePointLastMonth(today);

  const [account, byMonth, largestExpense, current, before] = await Promise.all([
    accountRepository.getPrimary(db),
    transactionRepository.monthlyTotalsSince(db, monthStart(addMonths(monthKey, -(STATS_MONTHS - 1)))),
    transactionRepository.largestExpenseBetween(db, start, today),
    transactionRepository.categoryTotalsBetween(db, start, today, 'expense'),
    transactionRepository.categoryTotalsBetween(db, previous.start, previous.end, 'expense'),
  ]);

  const months = monthFlows(byMonth, monthKey, STATS_MONTHS);
  const daysElapsed = Number(today.slice(8, 10));
  const thisMonth = months[months.length - 1];
  const sorted = [...current].sort((a, b) => b.totalMinor - a.totalMinor);

  return {
    currency: account.currency,
    monthKey,
    months,
    averageDailySpend: Math.round(thisMonth.expense / Math.max(1, daysElapsed)),
    averageMonthlySpend: averageMonthlySpend(months),
    largestExpense,
    topCategory: sorted[0] && sorted[0].totalMinor > 0 ? sorted[0] : null,
    changes: categoryChanges(current, before, 5),
  };
}
