import { migrateDatabase } from '@/data/db/migrate';
import { createTestDb } from '@/data/db/testing/create-test-db';
import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type { TransactionType } from '@/domain/finance/entities';

import { loadOverview } from '../overview';

const TODAY = '2026-09-21';

async function setup() {
  const db = createTestDb();
  await migrateDatabase(db);
  const add = (type: TransactionType, amountMinor: number, occurredOn: string, categoryId?: string) =>
    transactionRepository.create(db, { type, amountMinor, occurredOn, categoryId });
  return { db, add };
}

describe('loadOverview', () => {
  it('reports a first-run state with nothing recorded', async () => {
    const { db } = await setup();
    const overview = await loadOverview(db, TODAY);

    expect(overview.isEmpty).toBe(true);
    expect(overview.available).toBe(0);
    expect(overview.summary.savingsRate).toBeNull();
    expect(overview.recent).toEqual([]);
    expect(overview.categories.items).toEqual([]);
    expect(overview.dates).toHaveLength(21);
    expect(overview.balances.every((b) => b === 0)).toBe(true);
  });

  it('is not empty once a starting balance is set', async () => {
    const { db } = await setup();
    await accountRepository.updatePrimary(db, { openingBalanceMinor: 500_000 });
    const overview = await loadOverview(db, TODAY);
    expect(overview.isEmpty).toBe(false);
    expect(overview.available).toBe(500_000);
  });

  it('builds a normal month: balance, summary, breakdown and daily series', async () => {
    const { db, add } = await setup();
    await accountRepository.updatePrimary(db, { openingBalanceMinor: 500_000 });
    await add('expense', 300_000, '2026-08-15', 'exp-housing');
    await add('income', 6_000_000, '2026-09-01', 'inc-salary');
    await add('expense', 45_000, '2026-09-21', 'exp-food');
    await add('expense', 1_500_000, '2026-09-05', 'exp-housing');

    const overview = await loadOverview(db, TODAY);

    expect(overview.summary.startBalance).toBe(200_000);
    expect(overview.summary.income).toBe(6_000_000);
    expect(overview.summary.expense).toBe(1_545_000);
    expect(overview.available).toBe(200_000 + 6_000_000 - 1_545_000);
    expect(overview.summary.endBalance).toBe(overview.available);
    expect(overview.summary.savingsRate).toBeCloseTo(4_455_000 / 6_000_000);
    expect(overview.categories.items.map((c) => c.name)).toEqual(['Housing', 'Food']);
    // Day 1 includes the salary; the last point is today's balance.
    expect(overview.balances[0]).toBe(6_200_000);
    expect(overview.balances[overview.balances.length - 1]).toBe(overview.available);
    expect(overview.recent[0].occurredOn).toBe('2026-09-21');
  });

  it('handles multiple income sources', async () => {
    const { db, add } = await setup();
    await add('income', 6_000_000, '2026-09-01', 'inc-salary');
    await add('income', 1_200_000, '2026-09-12', 'inc-freelance');
    await add('income', 300_000, '2026-09-18', 'inc-investment');
    const overview = await loadOverview(db, TODAY);
    expect(overview.summary.income).toBe(7_500_000);
    expect(overview.summary.savingsRate).toBe(1);
  });

  it('handles spending with no income, going below zero', async () => {
    const { db, add } = await setup();
    await add('expense', 250_000, '2026-09-03', 'exp-shopping');
    const overview = await loadOverview(db, TODAY);
    expect(overview.available).toBe(-250_000);
    expect(overview.summary.savingsRate).toBeNull();
    expect(overview.summary.kept).toBe(-250_000);
  });

  it('handles high spending: more out than in', async () => {
    const { db, add } = await setup();
    await add('income', 1_000_000, '2026-09-01', 'inc-salary');
    await add('expense', 1_600_000, '2026-09-10', 'exp-travel');
    const overview = await loadOverview(db, TODAY);
    expect(overview.summary.savingsRate).toBeCloseTo(-0.6);
    expect(overview.available).toBe(-600_000);
  });

  it('compares spending with the same span of last month only', async () => {
    const { db, add } = await setup();
    await add('expense', 10_000, '2026-08-21', 'exp-food');
    await add('expense', 99_000, '2026-08-22', 'exp-food');
    const overview = await loadOverview(db, TODAY);
    expect(overview.spentSamePointLastMonth).toBe(10_000);
  });

  it('ignores deleted transactions everywhere', async () => {
    const { db, add } = await setup();
    const tx = await add('expense', 45_000, '2026-09-21', 'exp-food');
    await transactionRepository.softDelete(db, tx.id);
    const overview = await loadOverview(db, TODAY);
    expect(overview.isEmpty).toBe(true);
    expect(overview.summary.expense).toBe(0);
  });
});
