import { migrateDatabase } from '@/data/db/migrate';
import { createTestDb } from '@/data/db/testing/create-test-db';
import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type { PaymentMethod, TransactionType } from '@/domain/finance/entities';

import { loadFinanceStats } from '../stats';

// A Tuesday.
const TODAY = '2026-09-22';

async function setup() {
  const db = createTestDb();
  await migrateDatabase(db);
  return db;
}

/** Nearly two years of history: late 2024, a quiet 2025, and 2026 so far. */
async function seed() {
  const db = await setup();
  const add = (
    type: TransactionType,
    amountMinor: number,
    occurredOn: string,
    categoryId?: string,
    paymentMethod?: PaymentMethod,
  ) => transactionRepository.create(db, { type, amountMinor, occurredOn, categoryId, paymentMethod });

  await accountRepository.updatePrimary(db, { openingBalanceMinor: 100_000 });
  await add('income', 5_000_000, '2024-11-10', 'inc-salary');
  await add('expense', 1_000_000, '2024-11-12', 'exp-housing', 'bank');
  await add('expense', 200_000, '2025-03-05', 'exp-food', 'cash');
  await add('expense', 300_000, '2025-09-10', 'exp-food', 'upi');
  await add('expense', 100_000, '2026-08-05', 'exp-food', 'upi');
  await add('income', 6_000_000, '2026-09-01', 'inc-salary');
  await add('expense', 450_000, '2026-09-02', 'exp-food', 'upi');
  await add('expense', 50_000, '2026-09-15', 'exp-food', 'card');
  return db;
}

describe('loadFinanceStats', () => {
  it('reports a first-run state with nothing recorded', async () => {
    const db = await setup();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'month', month: '2026-09' });
    expect(stats.hasAnyRecords).toBe(false);
    expect(stats.hasData).toBe(false);
    expect(stats.bounds).toEqual({ firstMonth: '2026-09', lastMonth: '2026-09' });
  });

  it('builds a month: summary, like-for-like comparison, pace and habits', async () => {
    const db = await seed();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'month', month: '2026-09' });

    expect(stats.bounds).toEqual({ firstMonth: '2024-11', lastMonth: '2026-09' });
    expect(stats.range).toEqual({ from: '2026-09-01', to: TODAY, inProgress: true });
    expect(stats.summary).toMatchObject({ income: 6_000_000, expense: 500_000, net: 5_500_000 });
    expect(stats.comparison).toMatchObject({ label: 'Aug 1–22', summary: { expense: 100_000 } });
    expect(stats.flows.map((flow) => flow.key)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(stats.flowUnit).toBe('month');

    // End-of-day balances through today, finishing at everything recorded so far.
    expect(stats.balances).toHaveLength(22);
    expect(stats.balances[21].value).toBe(9_000_000);

    expect(stats.pace?.current).toHaveLength(22);
    expect(stats.pace?.current[21]).toBe(500_000);
    expect(stats.pace?.previous).toHaveLength(31);
    expect(stats.pace?.previous[30]).toBe(100_000);

    expect(stats.transactionCount).toBe(3);
    expect(stats.noSpendDays).toBe(20);
    expect(stats.averageDailySpend).toBe(Math.round(500_000 / 22));
    expect(stats.largestExpense?.amountMinor).toBe(450_000);
    expect(stats.topCategory?.categoryId).toBe('exp-food');
    expect(stats.incomeSources.items[0].categoryId).toBe('inc-salary');
    expect(stats.payments.map((payment) => [payment.method, payment.totalMinor])).toEqual([
      ['upi', 450_000],
      ['card', 50_000],
    ]);
    // Sep 2 was a Wednesday; September so far holds three of them.
    expect(stats.weekdays[2]).toBe(150_000);
    expect(stats.dailySpend).toBeNull();
    expect(stats.years).toEqual([]);
  });

  it('builds this year: twelve months, month-end balances and a daily calendar', async () => {
    const db = await seed();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'year', year: 2026 });

    expect(stats.flows).toHaveLength(12);
    expect(stats.flows.filter((flow) => flow.isFuture).map((flow) => flow.key)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(stats.flows[8]).toMatchObject({ label: 'S', title: 'September 2026', expense: 500_000 });
    expect(stats.balances).toHaveLength(9);
    expect(stats.balances[7].label).toBe('End of August 2026');
    expect(stats.balances[8]).toEqual({ label: 'September 2026 so far', value: 9_000_000 });
    expect(stats.comparison).toMatchObject({ label: 'Jan 1 – Sep 22, 2025', summary: { expense: 500_000 } });
    expect(stats.pace?.previous).toHaveLength(12);
    expect(stats.pace?.current).toHaveLength(9);
    expect(stats.dailySpend?.['2026-09-02']).toBe(450_000);
    expect(stats.costliestMonth?.key).toBe('2026-09');
    expect(stats.bestMonth?.key).toBe('2026-09');
  });

  it('shows a past year in full and averages every active month', async () => {
    const db = await seed();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'year', year: 2025 });

    expect(stats.range).toEqual({ from: '2025-01-01', to: '2025-12-31', inProgress: false });
    expect(stats.dayCount).toBe(365);
    expect(stats.comparison).toMatchObject({ label: '2024', summary: { income: 5_000_000, expense: 1_000_000 } });
    expect(stats.averageMonthlySpend).toBe(250_000);
    expect(stats.flows.every((flow) => !flow.isFuture)).toBe(true);
    expect(stats.balances).toHaveLength(12);
    expect(stats.balances[11].value).toBe(3_600_000);
  });

  it('builds all time: one bar per year and the year-by-year table', async () => {
    const db = await seed();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'all' });

    expect(stats.range.from).toBe('2024-11-10');
    expect(stats.flowUnit).toBe('year');
    expect(stats.flows.map((flow) => flow.key)).toEqual(['2024', '2025', '2026']);
    expect(stats.years.map((year) => [year.year, year.net])).toEqual([
      [2026, 5_400_000],
      [2025, -500_000],
      [2024, 4_000_000],
    ]);
    expect(stats.balances).toHaveLength(23);
    expect(stats.balances[22].value).toBe(9_000_000);
    expect(stats.comparison).toBeNull();
    expect(stats.pace).toBeNull();
    expect(stats.costliestMonth?.key).toBe('2024-11');
  });

  it('brings a period from before the first record back into range', async () => {
    const db = await seed();
    const stats = await loadFinanceStats(db, TODAY, { scope: 'month', month: '2020-01' });
    expect(stats.period).toEqual({ scope: 'month', month: '2024-11' });
    expect(stats.summary.income).toBe(5_000_000);
  });
});
