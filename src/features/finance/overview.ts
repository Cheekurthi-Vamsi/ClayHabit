import type { SQLiteDatabase } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type { FinAccount, FinTransactionView, MonthKey } from '@/domain/finance/entities';
import {
  availableBalance,
  breakdownByCategory,
  dailyBalances,
  summarizeMonth,
  type CategoryBreakdown,
  type MonthSummary,
} from '@/domain/finance/ledger';
import { datesInMonth, monthKeyOf, monthStart, samePointLastMonth } from '@/domain/finance/month';
import { addDaysIso } from '@/utils/date';

export const RECENT_LIMIT = 5;

export interface DayFlow {
  net: number;
  income: number;
  expense: number;
}

export interface FinanceOverview {
  account: FinAccount;
  today: string;
  monthKey: MonthKey;
  /** Balance today: opening balance plus everything recorded up to and including today. */
  available: number;
  summary: MonthSummary;
  /** Spending over the same span of last month, for a like-for-like comparison. */
  spentSamePointLastMonth: number;
  /** Month days up to today, with the end-of-day balance for each. */
  dates: string[];
  balances: number[];
  flows: Record<string, DayFlow>;
  categories: CategoryBreakdown;
  recent: FinTransactionView[];
  /** Whether anything has been recorded yet (drives the first-run state). */
  isEmpty: boolean;
}

/** Everything the Overview screen shows, read in one pass. */
export async function loadOverview(db: SQLiteDatabase, today: string): Promise<FinanceOverview> {
  const monthKey = monthKeyOf(today);
  const start = monthStart(monthKey);
  const lastMonth = samePointLastMonth(today);

  const [account, allTime, beforeMonth, month, lastMonthTotals, flows, categoryTotals, recent, count] =
    await Promise.all([
      accountRepository.getPrimary(db),
      transactionRepository.totalsBetween(db, { to: today }),
      transactionRepository.totalsBetween(db, { to: addDaysIso(start, -1) }),
      transactionRepository.totalsBetween(db, { from: start, to: today }),
      transactionRepository.totalsBetween(db, { from: lastMonth.start, to: lastMonth.end }),
      transactionRepository.dailyFlowsBetween(db, start, today),
      transactionRepository.categoryTotalsBetween(db, start, today, 'expense'),
      transactionRepository.listRecent(db, RECENT_LIMIT),
      transactionRepository.countAll(db),
    ]);

  const summary = summarizeMonth(account.openingBalanceMinor, beforeMonth, month);
  const dates = datesInMonth(monthKey, today);
  const netByDay = Object.fromEntries(Object.entries(flows).map(([day, flow]) => [day, flow.net]));

  return {
    account,
    today,
    monthKey,
    available: availableBalance(account.openingBalanceMinor, allTime),
    summary,
    spentSamePointLastMonth: lastMonthTotals.expense,
    dates,
    balances: dailyBalances(summary.startBalance, netByDay, dates),
    flows,
    categories: breakdownByCategory(categoryTotals, 5),
    recent,
    isEmpty: count === 0 && account.openingBalanceMinor === 0,
  };
}
