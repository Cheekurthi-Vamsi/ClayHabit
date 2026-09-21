import type { SQLiteDatabase } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as savingsRepository from '@/data/repositories/finance/savings-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type { BudgetPicture } from '@/domain/finance/budget';
import type { FinAccount, FinTransactionView, MonthKey, SavingsPlanWithProgress } from '@/domain/finance/entities';
import {
  availableBalance,
  breakdownByCategory,
  dailyBalances,
  savedInPlans,
  summarizeMonth,
  type CategoryBreakdown,
  type MonthSummary,
} from '@/domain/finance/ledger';
import { datesInMonth, monthKeyOf, monthStart, samePointLastMonth } from '@/domain/finance/month';
import { addDaysIso } from '@/utils/date';

import { loadBudgetPicture } from './budgets';

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
  /** Held in savings plans (set aside, so not part of `available`). */
  savedInPlans: number;
  summary: MonthSummary;
  /** Spending over the same span of last month, for a like-for-like comparison. */
  spentSamePointLastMonth: number;
  /** Month days up to today, with the end-of-day balance for each. */
  dates: string[];
  balances: number[];
  flows: Record<string, DayFlow>;
  categories: CategoryBreakdown;
  recent: FinTransactionView[];
  /** Active savings plans, most important first. */
  plans: SavingsPlanWithProgress[];
  budgets: BudgetPicture;
  /** Whether anything has been recorded yet (drives the first-run state). */
  isEmpty: boolean;
}

/** Everything the Overview screen shows, read in one pass. */
export async function loadOverview(db: SQLiteDatabase, today: string): Promise<FinanceOverview> {
  const monthKey = monthKeyOf(today);
  const start = monthStart(monthKey);
  const lastMonth = samePointLastMonth(today);

  const [account, allTime, beforeMonth, month, lastMonthTotals, flows, categoryTotals, recent, count, plans, budgets] =
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
      savingsRepository.listPlans(db, { today }),
      loadBudgetPicture(db, monthKey),
    ]);

  const summary = summarizeMonth(account.openingBalanceMinor, beforeMonth, month);
  const dates = datesInMonth(monthKey, today);
  const netByDay = Object.fromEntries(Object.entries(flows).map(([day, flow]) => [day, flow.net]));

  return {
    account,
    today,
    monthKey,
    available: availableBalance(account.openingBalanceMinor, allTime),
    savedInPlans: savedInPlans(allTime),
    summary,
    spentSamePointLastMonth: lastMonthTotals.expense,
    dates,
    balances: dailyBalances(summary.startBalance, netByDay, dates),
    flows,
    categories: breakdownByCategory(categoryTotals, 5),
    recent,
    plans,
    budgets,
    isEmpty: count === 0 && account.openingBalanceMinor === 0 && plans.length === 0,
  };
}
