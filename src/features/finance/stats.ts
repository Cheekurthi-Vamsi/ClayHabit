import type { SQLiteDatabase } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import {
  averageMonthlySpend,
  categoryChanges,
  cumulative,
  monthEndBalances,
  monthFlows,
  paymentShares,
  peakFlow,
  summarizePeriod,
  weekdayAverages,
  yearSummaries,
  type CategoryChange,
  type MonthFlow,
  type PaymentShare,
  type PeriodSummary,
  type YearSummary,
} from '@/domain/finance/analytics';
import type { CategoryTotal, FinTransactionView, MonthKey, TypeTotals } from '@/domain/finance/entities';
import { availableBalance, breakdownByCategory, dailyBalances, type CategoryBreakdown } from '@/domain/finance/ledger';
import {
  addMonths,
  datesInMonth,
  daysInMonth,
  formatDayLabel,
  formatMonthLabel,
  monthEnd,
  monthKeyOf,
  monthStart,
} from '@/domain/finance/month';
import {
  clampPeriod,
  comparisonRange,
  dayCount,
  monthsBetween,
  monthsOfYear,
  periodRange,
  yearEnd,
  yearOf,
  yearStart,
  type PeriodBounds,
  type PeriodRange,
  type StatsPeriod,
} from '@/domain/finance/period';
import { addDaysIso } from '@/utils/date';

/** Months of cash flow shown when looking at a single month. */
export const STATS_MONTHS = 6;

/** One group in the cash-flow chart: a month, or a whole year in the all-time view. */
export interface FlowBar {
  key: string;
  /** Axis label: "Sep", "S" or "2026". */
  label: string;
  /** Readout title: "September 2026" or "2026". */
  title: string;
  income: number;
  expense: number;
  net: number;
  /** After today, so nothing could have been recorded yet. */
  isFuture: boolean;
}

export interface TrendPoint {
  /** "Sep 21", or "End of August 2026" / "September 2026 so far" for month-end points. */
  label: string;
  value: number;
}

/** Cumulative spending through this period, against the whole of the one before. */
export interface SpendingPace {
  current: number[];
  previous: number[];
  /** Axis position labels ("Day 12", "March"), one per index of the longer series. */
  pointLabels: string[];
  currentLabel: string;
  previousLabel: string;
}

export interface FinanceStats {
  currency: string;
  today: string;
  /** The period actually shown — the requested one, brought inside the recorded range. */
  period: StatsPeriod;
  range: PeriodRange;
  bounds: PeriodBounds;
  /** Anything recorded in this period. */
  hasData: boolean;
  /** Anything recorded at all. */
  hasAnyRecords: boolean;
  summary: PeriodSummary;
  /** The like-for-like period before this one; null for all time. */
  comparison: { label: string; summary: PeriodSummary } | null;
  flowUnit: 'month' | 'year';
  flows: FlowBar[];
  /** End-of-day balances through a month, or month-end balances through a year / all time. */
  balances: TrendPoint[];
  pace: SpendingPace | null;
  /** Spending per day, for the calendar heatmap (year view only). */
  dailySpend: Record<string, number> | null;
  averageDailySpend: number;
  averageMonthlySpend: number | null;
  largestExpense: FinTransactionView | null;
  topCategory: CategoryTotal | null;
  transactionCount: number;
  /** Days in the period (so far) without a single expense. */
  noSpendDays: number;
  dayCount: number;
  /** The month with the most spending, and the one that kept the most (year and all-time views). */
  costliestMonth: FlowBar | null;
  bestMonth: FlowBar | null;
  categories: CategoryBreakdown;
  incomeSources: CategoryBreakdown;
  changes: CategoryChange[];
  /** Average spend per weekday, Monday first. */
  weekdays: number[];
  payments: PaymentShare[];
  /** Year-by-year summaries, newest first (all-time view only). */
  years: YearSummary[];
}

/** "End of August 2026", or "September 2026 so far" for the month still running. */
function monthEndLabel(month: MonthKey, today: string): string {
  return month === monthKeyOf(today) ? `${formatMonthLabel(month)} so far` : `End of ${formatMonthLabel(month)}`;
}

function toFlowBar(flow: MonthFlow, today: string, initialOnly: boolean): FlowBar {
  return {
    key: flow.month,
    label: initialOnly ? flow.label.charAt(0) : flow.label,
    title: formatMonthLabel(flow.month),
    income: flow.income,
    expense: flow.expense,
    net: flow.net,
    isFuture: monthStart(flow.month) > today,
  };
}

/** Everything the Stats screen shows for one month, one year, or all time. */
export async function loadFinanceStats(
  db: SQLiteDatabase,
  today: string,
  requested: StatsPeriod,
): Promise<FinanceStats> {
  const [account, dates] = await Promise.all([
    accountRepository.getPrimary(db),
    transactionRepository.dateBounds(db),
  ]);
  const todayMonth = monthKeyOf(today);
  const firstDay = dates.first && dates.first < today ? dates.first : null;
  const bounds: PeriodBounds = { firstMonth: firstDay ? monthKeyOf(firstDay) : todayMonth, lastMonth: todayMonth };
  const period = clampPeriod(requested, bounds);
  const range = periodRange(period, today, firstDay);
  const compare = comparisonRange(period, today);

  // Shared by every view.
  const [totals, beforeRange, categoryTotals, incomeTotals, largestExpense, transactionCount, spendDays, weekdayTotals, paymentRows] =
    await Promise.all([
      transactionRepository.totalsBetween(db, range),
      transactionRepository.totalsBetween(db, { to: addDaysIso(range.from, -1) }),
      transactionRepository.categoryTotalsBetween(db, range.from, range.to, 'expense'),
      transactionRepository.categoryTotalsBetween(db, range.from, range.to, 'income'),
      transactionRepository.largestExpenseBetween(db, range.from, range.to),
      transactionRepository.countBetween(db, range.from, range.to),
      transactionRepository.spendingDaysBetween(db, range.from, range.to),
      transactionRepository.weekdayExpenseTotalsBetween(db, range.from, range.to),
      transactionRepository.paymentMethodTotalsBetween(db, range.from, range.to),
    ]);

  const [compareTotals, compareCategories] = compare
    ? await Promise.all([
        transactionRepository.totalsBetween(db, compare),
        transactionRepository.categoryTotalsBetween(db, compare.from, compare.to, 'expense'),
      ])
    : [null, []];

  const startBalance = availableBalance(account.openingBalanceMinor, beforeRange);
  const days = dayCount(range);
  const sortedCategories = [...categoryTotals].sort((a, b) => b.totalMinor - a.totalMinor);

  const shared = {
    currency: account.currency,
    today,
    period,
    range,
    bounds,
    hasData: transactionCount > 0,
    hasAnyRecords: dates.first !== null,
    summary: summarizePeriod(totals),
    comparison: compare && compareTotals ? { label: compare.label, summary: summarizePeriod(compareTotals) } : null,
    averageDailySpend: Math.round(totals.expense / Math.max(1, days)),
    largestExpense,
    topCategory: sortedCategories[0] && sortedCategories[0].totalMinor > 0 ? sortedCategories[0] : null,
    transactionCount,
    noSpendDays: Math.max(0, days - spendDays),
    dayCount: days,
    categories: breakdownByCategory(categoryTotals, 5),
    incomeSources: breakdownByCategory(incomeTotals, 4),
    changes: compare ? categoryChanges(categoryTotals, compareCategories, 5) : [],
    weekdays: weekdayAverages(weekdayTotals, range.from, range.to),
    payments: paymentShares(paymentRows),
  };

  if (period.scope === 'month') {
    return { ...shared, ...(await loadMonthViews(db, today, period.month, range, startBalance)) };
  }
  if (period.scope === 'year') {
    return { ...shared, ...(await loadYearViews(db, today, period.year, range, startBalance)) };
  }
  return { ...shared, ...(await loadAllTimeViews(db, today, bounds, account.openingBalanceMinor)) };
}

type ScopedViews = Pick<
  FinanceStats,
  | 'flowUnit'
  | 'flows'
  | 'balances'
  | 'pace'
  | 'dailySpend'
  | 'averageMonthlySpend'
  | 'costliestMonth'
  | 'bestMonth'
  | 'years'
>;

async function loadMonthViews(
  db: SQLiteDatabase,
  today: string,
  month: MonthKey,
  range: PeriodRange,
  startBalance: number,
): Promise<ScopedViews> {
  const previous = addMonths(month, -1);
  const [byMonth, daily] = await Promise.all([
    transactionRepository.monthlyTotalsSince(db, monthStart(addMonths(month, -(STATS_MONTHS - 1))), monthEnd(month)),
    // Last month too, for the pace comparison.
    transactionRepository.dailyFlowsBetween(db, monthStart(previous), range.to),
  ]);

  const flows = monthFlows(byMonth, month, STATS_MONTHS);
  const dates = datesInMonth(month, range.to);
  const netByDay = Object.fromEntries(dates.map((date) => [date, daily[date]?.net ?? 0]));
  const balances = dailyBalances(startBalance, netByDay, dates);

  const previousDates = datesInMonth(previous);
  const previousSpend = previousDates.map((date) => daily[date]?.expense ?? 0);
  const longest = Math.max(daysInMonth(month), previousDates.length);

  return {
    flowUnit: 'month',
    flows: flows.map((flow) => toFlowBar(flow, today, false)),
    balances: dates.map((date, index) => ({ label: formatDayLabel(date), value: balances[index] })),
    pace: previousSpend.some((value) => value > 0)
      ? {
          current: cumulative(dates.map((date) => daily[date]?.expense ?? 0)),
          previous: cumulative(previousSpend),
          pointLabels: Array.from({ length: longest }, (_, index) => `Day ${index + 1}`),
          currentLabel: formatMonthLabel(month).split(' ')[0],
          previousLabel: formatMonthLabel(previous).split(' ')[0],
        }
      : null,
    dailySpend: null,
    averageMonthlySpend: averageMonthlySpend(flows),
    costliestMonth: null,
    bestMonth: null,
    years: [],
  };
}

async function loadYearViews(
  db: SQLiteDatabase,
  today: string,
  year: number,
  range: PeriodRange,
  startBalance: number,
): Promise<ScopedViews> {
  const [byMonth, daily] = await Promise.all([
    // Last year too, for the pace comparison.
    transactionRepository.monthlyTotalsSince(db, yearStart(year - 1), yearEnd(year)),
    transactionRepository.dailyFlowsBetween(db, range.from, range.to),
  ]);

  const months = monthsOfYear(year);
  const flows = monthFlows(byMonth, months[11], 12);
  const shownMonths = months.filter((month) => monthStart(month) <= today);
  const balances = monthEndBalances(startBalance, byMonth, shownMonths);
  const previousSpend = monthsOfYear(year - 1).map((month) => byMonth[month]?.expense ?? 0);
  const past = flows.filter((flow) => monthStart(flow.month) <= today).map((flow) => toFlowBar(flow, today, true));

  return {
    flowUnit: 'month',
    flows: flows.map((flow) => toFlowBar(flow, today, true)),
    balances: shownMonths.map((month, index) => ({ label: monthEndLabel(month, today), value: balances[index] })),
    pace: previousSpend.some((value) => value > 0)
      ? {
          current: cumulative(shownMonths.map((month) => byMonth[month]?.expense ?? 0)),
          previous: cumulative(previousSpend),
          pointLabels: months.map((month) => formatMonthLabel(month).split(' ')[0]),
          currentLabel: String(year),
          previousLabel: String(year - 1),
        }
      : null,
    dailySpend: Object.fromEntries(Object.entries(daily).map(([date, flow]) => [date, flow.expense])),
    averageMonthlySpend: averageMonthlySpend(
      flows.filter((flow) => monthStart(flow.month) <= today),
      range.inProgress,
    ),
    costliestMonth: peakFlow(past, (flow) => flow.expense),
    bestMonth: peakFlow(past, (flow) => flow.net),
    years: [],
  };
}

async function loadAllTimeViews(
  db: SQLiteDatabase,
  today: string,
  bounds: PeriodBounds,
  openingMinor: number,
): Promise<ScopedViews> {
  const byMonth: Record<MonthKey, TypeTotals> = await transactionRepository.monthlyTotalsSince(
    db,
    monthStart(bounds.firstMonth),
    today,
  );
  const months = monthsBetween(bounds.firstMonth, bounds.lastMonth);
  const firstYear = yearOf(monthStart(bounds.firstMonth));
  const lastYear = yearOf(today);
  const years = yearSummaries(byMonth, firstYear, lastYear);
  const balances = monthEndBalances(openingMinor, byMonth, months);
  const monthly = monthFlows(byMonth, bounds.lastMonth, months.length).map((flow) => toFlowBar(flow, today, false));
  const short = years.length > 6;

  return {
    flowUnit: 'year',
    flows: [...years].reverse().map((summary) => ({
      key: String(summary.year),
      // Two-digit years once there are too many to fit ("'24").
      label: short ? `'${String(summary.year).slice(-2)}` : String(summary.year),
      title: String(summary.year),
      income: summary.income,
      expense: summary.expense,
      net: summary.net,
      isFuture: false,
    })),
    balances: months.map((month, index) => ({ label: monthEndLabel(month, today), value: balances[index] })),
    pace: null,
    dailySpend: null,
    // The last month is always this one, still in progress.
    averageMonthlySpend: averageMonthlySpend(monthFlows(byMonth, bounds.lastMonth, months.length)),
    costliestMonth: peakFlow(monthly, (flow) => flow.expense),
    bestMonth: peakFlow(monthly, (flow) => flow.net),
    years,
  };
}
