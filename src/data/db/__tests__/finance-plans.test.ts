import * as budgetRepository from '@/data/repositories/finance/budget-repository';
import * as categoryRepository from '@/data/repositories/finance/category-repository';
import * as savingsRepository from '@/data/repositories/finance/savings-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import { loadBudgetPicture } from '@/features/finance/budgets';
import { loadOverview } from '@/features/finance/overview';

import { migrateDatabase } from '../migrate';
import { migrations } from '../migrations';
import { createTestDb } from '../testing/create-test-db';

const TODAY = '2026-09-21';

async function setup() {
  const db = createTestDb();
  await migrateDatabase(db);
  return db;
}

describe('migration 0010', () => {
  it('rebuilds fin_transactions without losing a row, then accepts withdrawals', async () => {
    const db = createTestDb();
    await db.execAsync('PRAGMA foreign_keys = ON;');
    for (const migration of migrations.filter((m) => m.version <= 9)) {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
    await db.runAsync(
      `INSERT INTO fin_transactions (id, account_id, type, amount_minor, currency, category_id, occurred_on, occurred_at, note, created_at, updated_at)
       VALUES ('old-1', 'main', 'expense', 45000, 'INR', 'exp-food', '2026-09-20', '2026-09-20T15:00:00.000Z', 'Dinner', 'x', 'x')`,
    );

    await migrateDatabase(db);

    const kept = await transactionRepository.getById(db, 'old-1');
    expect(kept).toMatchObject({ amountMinor: 45_000, note: 'Dinner', categoryId: 'exp-food', savingsPlanId: null });
    expect(kept?.category?.name).toBe('Food');

    const plan = await savingsRepository.createPlan(db, { name: 'Trip', targetMinor: 100_000 });
    await expect(
      transactionRepository.create(db, { type: 'withdrawal', amountMinor: 1, occurredOn: TODAY, savingsPlanId: plan.id }),
    ).resolves.toBeTruthy();
    const fk = await db.getAllAsync('PRAGMA foreign_key_check');
    expect(fk).toEqual([]);
  });
});

describe('savings plans', () => {
  it('derives the saved amount from deposits and withdrawals', async () => {
    const db = await setup();
    const plan = await savingsRepository.createPlan(db, { name: 'New laptop', emoji: '💻', targetMinor: 4_500_000 });

    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'deposit', amountMinor: 1_500_000, occurredOn: '2026-09-01' }, TODAY);
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'deposit', amountMinor: 500_000, occurredOn: '2026-09-10' }, TODAY);
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'withdraw', amountMinor: 150_000, occurredOn: '2026-09-15' }, TODAY);

    const loaded = await savingsRepository.getPlan(db, plan.id, TODAY);
    expect(loaded).toMatchObject({ savedMinor: 1_850_000, entryCount: 3, completedAt: null });
    expect(loaded?.recentMonthlyMinor).toBe(Math.round(1_850_000 / 3));
    expect(await savingsRepository.totalSaved(db)).toBe(1_850_000);

    const entries = await savingsRepository.listEntries(db, plan.id);
    expect(entries.map((entry) => entry.type)).toEqual(['withdrawal', 'saving', 'saving']);
    expect(entries[0].savingsPlan).toMatchObject({ name: 'New laptop', emoji: '💻' });
  });

  it('moves money out of (and back into) the available balance', async () => {
    const db = await setup();
    await transactionRepository.create(db, { type: 'income', amountMinor: 6_000_000, occurredOn: '2026-09-01', categoryId: 'inc-salary' });
    const plan = await savingsRepository.createPlan(db, { name: 'Emergency fund', targetMinor: 10_000_000 });
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'deposit', amountMinor: 2_000_000, occurredOn: '2026-09-02' }, TODAY);
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'withdraw', amountMinor: 500_000, occurredOn: '2026-09-05' }, TODAY);

    const overview = await loadOverview(db, TODAY);
    expect(overview.available).toBe(6_000_000 - 2_000_000 + 500_000);
    expect(overview.savedInPlans).toBe(1_500_000);
    expect(overview.summary.kept).toBe(6_000_000);
    expect(overview.summary.setAside).toBe(1_500_000);
    expect(overview.plans.map((p) => p.name)).toEqual(['Emergency fund']);
  });

  it('refuses to withdraw more than the plan holds', async () => {
    const db = await setup();
    const plan = await savingsRepository.createPlan(db, { name: 'Trip', targetMinor: 100_000 });
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'deposit', amountMinor: 10_000, occurredOn: TODAY }, TODAY);
    await expect(
      savingsRepository.addEntry(db, { planId: plan.id, kind: 'withdraw', amountMinor: 10_001, occurredOn: TODAY }, TODAY),
    ).rejects.toThrow(/more than this plan holds/);
  });

  it('stamps completion when the target is reached, and clears it if money comes back out', async () => {
    const db = await setup();
    const plan = await savingsRepository.createPlan(db, { name: 'Phone', targetMinor: 100_000 });
    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'deposit', amountMinor: 100_000, occurredOn: TODAY }, TODAY);
    expect((await savingsRepository.getPlan(db, plan.id, TODAY))?.completedAt).not.toBeNull();

    await savingsRepository.addEntry(db, { planId: plan.id, kind: 'withdraw', amountMinor: 1, occurredOn: TODAY }, TODAY);
    expect((await savingsRepository.getPlan(db, plan.id, TODAY))?.completedAt).toBeNull();
  });

  it('deletes an unused plan but archives one with history', async () => {
    const db = await setup();
    const unused = await savingsRepository.createPlan(db, { name: 'Maybe', targetMinor: 1_000 });
    const used = await savingsRepository.createPlan(db, { name: 'Real', targetMinor: 1_000 });
    await savingsRepository.addEntry(db, { planId: used.id, kind: 'deposit', amountMinor: 500, occurredOn: TODAY }, TODAY);

    expect(await savingsRepository.removePlan(db, unused.id)).toBe('deleted');
    expect(await savingsRepository.removePlan(db, used.id)).toBe('archived');
    expect(await savingsRepository.listPlans(db, { today: TODAY })).toEqual([]);
    expect((await savingsRepository.listPlans(db, { today: TODAY, includeArchived: true })).map((p) => p.name)).toEqual(['Real']);
    expect(await transactionRepository.countAll(db)).toBe(1);
  });

  it('orders plans by priority, and validates input', async () => {
    const db = await setup();
    await savingsRepository.createPlan(db, { name: 'Low', targetMinor: 1_000, priority: 3 });
    await savingsRepository.createPlan(db, { name: 'High', targetMinor: 1_000, priority: 1 });
    expect((await savingsRepository.listPlans(db, { today: TODAY })).map((p) => p.name)).toEqual(['High', 'Low']);

    await expect(savingsRepository.createPlan(db, { name: '  ', targetMinor: 1_000 })).rejects.toThrow(/name/);
    await expect(savingsRepository.createPlan(db, { name: 'X', targetMinor: 0 })).rejects.toThrow(/target/);
    await expect(
      savingsRepository.createPlan(db, { name: 'X', targetMinor: 1_000, targetDate: '21/09/2026' }),
    ).rejects.toThrow(/date/);
  });

  it('keeps savings entries and categories apart', async () => {
    const db = await setup();
    await expect(
      transactionRepository.create(db, { type: 'saving', amountMinor: 100, occurredOn: TODAY }),
    ).rejects.toThrow(/which savings plan/);
    const plan = await savingsRepository.createPlan(db, { name: 'Trip', targetMinor: 1_000 });
    await expect(
      transactionRepository.create(db, { type: 'expense', amountMinor: 100, occurredOn: TODAY, savingsPlanId: plan.id }),
    ).rejects.toThrow(/Only savings entries/);
    await expect(
      transactionRepository.create(db, { type: 'saving', amountMinor: 100, occurredOn: TODAY, savingsPlanId: plan.id, categoryId: 'exp-food' }),
    ).rejects.toThrow(/belongs to a plan/);
  });
});

describe('budgets', () => {
  it('applies a budget from its month onward, keeping earlier months as they were', async () => {
    const db = await setup();
    await budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 800_000, month: '2026-07' });
    await budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 900_000, month: '2026-09' });

    expect(await budgetRepository.budgetsForMonth(db, '2026-06')).toEqual([]);
    expect((await budgetRepository.budgetsForMonth(db, '2026-08'))[0].limitMinor).toBe(800_000);
    expect((await budgetRepository.budgetsForMonth(db, '2026-09'))[0].limitMinor).toBe(900_000);
    expect((await budgetRepository.budgetsForMonth(db, '2027-01'))[0].limitMinor).toBe(900_000);
  });

  it('updates in place when set twice in the same month, and ends when removed', async () => {
    const db = await setup();
    await budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 800_000, month: '2026-09' });
    await budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 700_000, month: '2026-09' });
    expect(await budgetRepository.budgetsForMonth(db, '2026-09')).toMatchObject([{ limitMinor: 700_000 }]);

    await budgetRepository.removeBudget(db, { categoryId: 'exp-food', month: '2026-10' });
    expect(await budgetRepository.budgetsForMonth(db, '2026-09')).toHaveLength(1);
    expect(await budgetRepository.budgetsForMonth(db, '2026-10')).toEqual([]);
  });

  it('only budgets spending categories', async () => {
    const db = await setup();
    await expect(
      budgetRepository.setBudget(db, { categoryId: 'inc-salary', amountMinor: 100, month: '2026-09' }),
    ).rejects.toThrow(/spending categories/);
    await expect(
      budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 100, month: '2026-9' }),
    ).rejects.toThrow(/month/);
  });

  it('builds the month picture: usage, overall budget and unbudgeted spending', async () => {
    const db = await setup();
    const add = (amountMinor: number, categoryId: string) =>
      transactionRepository.create(db, { type: 'expense', amountMinor, occurredOn: '2026-09-10', categoryId });
    await add(540_000, 'exp-food');
    await add(380_000, 'exp-transport');
    await add(120_000, 'exp-shopping');
    await budgetRepository.setBudget(db, { categoryId: 'exp-food', amountMinor: 800_000, month: '2026-09' });
    await budgetRepository.setBudget(db, { categoryId: 'exp-transport', amountMinor: 400_000, month: '2026-09' });
    await budgetRepository.setBudget(db, { categoryId: null, amountMinor: 2_000_000, month: '2026-09' });

    const picture = await loadBudgetPicture(db, '2026-09');
    expect(picture.overall?.usage).toMatchObject({ spentMinor: 1_040_000, limitMinor: 2_000_000, state: 'healthy' });
    expect(picture.lines.map((line) => [line.name, line.usage.state])).toEqual([
      ['Transport', 'near-limit'],
      ['Food', 'healthy'],
    ]);
    expect(picture.unbudgeted.map((item) => [item.name, item.spentMinor])).toEqual([['Shopping', 120_000]]);
  });
});

describe('category management', () => {
  it('adds, renames and archives while history keeps the name', async () => {
    const db = await setup();
    const pets = await categoryRepository.create(db, 'expense', { name: ' Pets ', emoji: '🐶', color: 'amber' });
    expect(pets).toMatchObject({ name: 'Pets', kind: 'expense', emoji: '🐶' });
    await expect(categoryRepository.create(db, 'expense', { name: 'pets', emoji: '🐱', color: 'amber' })).rejects.toThrow(
      /already have/,
    );

    const tx = await transactionRepository.create(db, { type: 'expense', amountMinor: 900, occurredOn: TODAY, categoryId: pets.id });
    await categoryRepository.update(db, pets.id, { name: 'Pet care', emoji: '🐾', color: 'mint' });
    await categoryRepository.archive(db, pets.id);

    expect((await categoryRepository.listByKind(db, 'expense')).some((c) => c.id === pets.id)).toBe(false);
    expect((await transactionRepository.getById(db, tx.id))?.category).toMatchObject({ name: 'Pet care', emoji: '🐾' });
  });

  it('reorders by swapping neighbours', async () => {
    const db = await setup();
    await categoryRepository.move(db, 'exp-housing', 'up');
    const names = (await categoryRepository.listByKind(db, 'expense')).map((c) => c.name);
    expect(names.slice(0, 3)).toEqual(['Housing', 'Food', 'Transport']);
    await categoryRepository.move(db, 'exp-housing', 'up');
    expect((await categoryRepository.listByKind(db, 'expense'))[0].name).toBe('Housing');
  });
});

describe('search and filters', () => {
  async function seeded() {
    const db = await setup();
    const add = (input: Parameters<typeof transactionRepository.create>[1]) => transactionRepository.create(db, input);
    await add({ type: 'expense', amountMinor: 45_000, occurredOn: '2026-09-20', categoryId: 'exp-food', merchant: 'Café Blue', paymentMethod: 'upi' });
    await add({ type: 'expense', amountMinor: 18_000, occurredOn: '2026-08-02', categoryId: 'exp-transport', note: 'Cab to airport', paymentMethod: 'card' });
    await add({ type: 'expense', amountMinor: 5_000, occurredOn: '2026-09-01', note: '50% off sale' });
    await add({ type: 'income', amountMinor: 6_000_000, occurredOn: '2026-09-01', categoryId: 'inc-salary', merchant: 'Acme Corp' });
    return db;
  }

  it('finds matches in merchant, note and category name across all months', async () => {
    const db = await seeded();
    const titles = async (query: string) =>
      (await transactionRepository.listFiltered(db, { query })).map((t) => t.merchant ?? t.note);
    expect(await titles('café')).toEqual(['Café Blue']);
    expect(await titles('AIRPORT')).toEqual(['Cab to airport']);
    expect(await titles('transport')).toEqual(['Cab to airport']);
    expect(await titles('salary')).toEqual(['Acme Corp']);
  });

  it('treats % and _ literally', async () => {
    const db = await seeded();
    expect((await transactionRepository.listFiltered(db, { query: '50%' })).map((t) => t.note)).toEqual(['50% off sale']);
    expect(await transactionRepository.listFiltered(db, { query: '%' })).toHaveLength(1);
    expect(await transactionRepository.listFiltered(db, { query: '_' })).toHaveLength(0);
  });

  it('filters by type, category (or none), payment method and date range', async () => {
    const db = await seeded();
    expect(await transactionRepository.listFiltered(db, { type: 'income' })).toHaveLength(1);
    expect(await transactionRepository.listFiltered(db, { categoryId: 'exp-food' })).toHaveLength(1);
    expect((await transactionRepository.listFiltered(db, { categoryId: null })).map((t) => t.note)).toEqual(['50% off sale']);
    expect(await transactionRepository.listFiltered(db, { paymentMethod: 'card' })).toHaveLength(1);
    expect(await transactionRepository.listFiltered(db, { from: '2026-09-01', to: '2026-09-30' })).toHaveLength(3);
  });

  it('totals per month for trends', async () => {
    const db = await seeded();
    const months = await transactionRepository.monthlyTotalsSince(db, '2026-08-01');
    expect(months['2026-08'].expense).toBe(18_000);
    expect(months['2026-09']).toMatchObject({ expense: 50_000, income: 6_000_000 });
    expect((await transactionRepository.largestExpenseBetween(db, '2026-09-01', '2026-09-30'))?.merchant).toBe('Café Blue');
  });
});
