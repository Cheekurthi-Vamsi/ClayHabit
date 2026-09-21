import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as categoryRepository from '@/data/repositories/finance/category-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';

import { migrateDatabase } from '../migrate';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, up as upFinance } from '../migrations/0009-finance';
import { createTestDb } from '../testing/create-test-db';

async function setup() {
  const db = createTestDb();
  await migrateDatabase(db);
  return db;
}

describe('finance schema', () => {
  it('seeds a primary INR account with a zero opening balance', async () => {
    const db = await setup();
    const account = await accountRepository.getPrimary(db);
    expect(account).toMatchObject({ id: 'main', currency: 'INR', openingBalanceMinor: 0 });
  });

  it('seeds the default expense and income categories in order', async () => {
    const db = await setup();
    const expense = await categoryRepository.listByKind(db, 'expense');
    const income = await categoryRepository.listByKind(db, 'income');
    expect(expense.map((c) => c.name)).toEqual(DEFAULT_EXPENSE_CATEGORIES.map(([, name]) => name));
    expect(income.map((c) => c.name)).toEqual(DEFAULT_INCOME_CATEGORIES.map(([, name]) => name));
    expect(expense[0]).toMatchObject({ emoji: '🍔', kind: 'expense' });
  });

  it('is safe to re-run', async () => {
    const db = await setup();
    await expect(upFinance(db)).resolves.toBeUndefined();
    expect(await categoryRepository.listByKind(db, 'expense')).toHaveLength(DEFAULT_EXPENSE_CATEGORIES.length);
  });

  it('rejects non-positive amounts at the database level too', async () => {
    const db = await setup();
    await expect(
      db.runAsync(
        `INSERT INTO fin_transactions (id, account_id, type, amount_minor, currency, occurred_on, occurred_at, created_at, updated_at)
         VALUES ('x', 'main', 'expense', 0, 'INR', '2026-09-21', '', '', '')`,
      ),
    ).rejects.toThrow();
  });
});

describe('transactionRepository.create', () => {
  it('records an expense with its category and the account currency', async () => {
    const db = await setup();
    const tx = await transactionRepository.create(db, {
      type: 'expense',
      amountMinor: 45_000,
      categoryId: 'exp-food',
      occurredOn: '2026-09-21',
      note: '  Dinner  ',
      paymentMethod: 'upi',
    });

    expect(tx).toMatchObject({
      type: 'expense',
      amountMinor: 45_000,
      currency: 'INR',
      categoryId: 'exp-food',
      occurredOn: '2026-09-21',
      note: 'Dinner',
      paymentMethod: 'upi',
      merchant: null,
    });
    const [view] = await transactionRepository.listRecent(db, 5);
    expect(view.category).toMatchObject({ name: 'Food', emoji: '🍔' });
  });

  it('only needs an amount, a type and a day', async () => {
    const db = await setup();
    const tx = await transactionRepository.create(db, { type: 'expense', amountMinor: 1, occurredOn: '2026-09-21' });
    expect(tx.categoryId).toBeNull();
  });

  it('validates amount, date, category kind and payment method', async () => {
    const db = await setup();
    const base = { type: 'expense' as const, amountMinor: 100, occurredOn: '2026-09-21' };
    await expect(transactionRepository.create(db, { ...base, amountMinor: 0 })).rejects.toThrow(/greater than zero/);
    await expect(transactionRepository.create(db, { ...base, amountMinor: 12.5 })).rejects.toThrow();
    await expect(transactionRepository.create(db, { ...base, occurredOn: '2026-02-30' })).rejects.toThrow(/valid date/);
    await expect(transactionRepository.create(db, { ...base, occurredOn: '21/09/2026' })).rejects.toThrow(/valid date/);
    await expect(transactionRepository.create(db, { ...base, categoryId: 'inc-salary' })).rejects.toThrow(/income category/);
    await expect(transactionRepository.create(db, { ...base, categoryId: 'missing' })).rejects.toThrow(/no longer exists/);
    await expect(
      transactionRepository.create(db, { ...base, paymentMethod: 'cheque' as never }),
    ).rejects.toThrow(/payment method/);
  });

  it('accepts a leap day', async () => {
    const db = await setup();
    await expect(
      transactionRepository.create(db, { type: 'expense', amountMinor: 100, occurredOn: '2028-02-29' }),
    ).resolves.toMatchObject({ occurredOn: '2028-02-29' });
  });
});

describe('transactionRepository.update / softDelete', () => {
  it('edits in place and keeps the time of day when the date moves', async () => {
    const db = await setup();
    const tx = await transactionRepository.create(db, {
      type: 'expense',
      amountMinor: 45_000,
      categoryId: 'exp-food',
      occurredOn: '2026-09-21',
      occurredAt: new Date(2026, 8, 21, 20, 30).toISOString(),
    });

    const updated = await transactionRepository.update(db, tx.id, { amountMinor: 50_000, occurredOn: '2026-09-20' });
    expect(updated.amountMinor).toBe(50_000);
    expect(updated.occurredOn).toBe('2026-09-20');
    const at = new Date(updated.occurredAt);
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([20, 20, 30]);
  });

  it('can switch an expense to income along with a matching category', async () => {
    const db = await setup();
    const tx = await transactionRepository.create(db, { type: 'expense', amountMinor: 100, occurredOn: '2026-09-21', categoryId: 'exp-food' });
    await expect(transactionRepository.update(db, tx.id, { type: 'income' })).rejects.toThrow(/expense category/);
    const fixed = await transactionRepository.update(db, tx.id, { type: 'income', categoryId: 'inc-salary' });
    expect(fixed).toMatchObject({ type: 'income', categoryId: 'inc-salary' });
  });

  it('soft-deletes: gone from reads and totals, but the row is kept', async () => {
    const db = await setup();
    const tx = await transactionRepository.create(db, { type: 'expense', amountMinor: 100, occurredOn: '2026-09-21' });
    await transactionRepository.softDelete(db, tx.id);

    expect(await transactionRepository.getById(db, tx.id)).toBeNull();
    expect(await transactionRepository.countAll(db)).toBe(0);
    expect((await transactionRepository.totalsBetween(db)).expense).toBe(0);
    const raw = await db.getFirstAsync<{ deleted_at: string | null }>('SELECT deleted_at FROM fin_transactions WHERE id = ?', tx.id);
    expect(raw?.deleted_at).not.toBeNull();
    await expect(transactionRepository.update(db, tx.id, { amountMinor: 5 })).rejects.toThrow(/no longer exists/);
  });
});

describe('aggregates', () => {
  async function seeded() {
    const db = await setup();
    const add = (type: 'income' | 'expense' | 'saving', amountMinor: number, occurredOn: string, categoryId?: string) =>
      transactionRepository.create(db, { type, amountMinor, occurredOn, categoryId });
    await add('income', 6_000_000, '2026-09-01', 'inc-salary');
    await add('income', 1_500_000, '2026-09-10', 'inc-freelance');
    await add('expense', 45_000, '2026-09-21', 'exp-food');
    await add('expense', 18_000, '2026-09-21', 'exp-transport');
    await add('expense', 30_000, '2026-09-20', 'exp-food');
    await add('saving', 500_000, '2026-09-15');
    await add('expense', 999_900, '2026-08-31', 'exp-housing');
    return db;
  }

  it('totals by type within a range, with open ends', async () => {
    const db = await seeded();
    expect(await transactionRepository.totalsBetween(db, { from: '2026-09-01', to: '2026-09-30' })).toEqual({
      income: 7_500_000,
      expense: 93_000,
      saving: 500_000,
      transfer: 0,
    });
    expect((await transactionRepository.totalsBetween(db, { to: '2026-08-31' })).expense).toBe(999_900);
    expect((await transactionRepository.totalsBetween(db)).expense).toBe(1_092_900);
  });

  it('computes daily flows', async () => {
    const db = await seeded();
    const flows = await transactionRepository.dailyFlowsBetween(db, '2026-09-01', '2026-09-30');
    expect(flows['2026-09-21']).toEqual({ net: -63_000, income: 0, expense: 63_000 });
    expect(flows['2026-09-15']).toEqual({ net: -500_000, income: 0, expense: 0 });
    expect(flows['2026-08-31']).toBeUndefined();
  });

  it('totals spending per category, uncategorised grouped together', async () => {
    const db = await seeded();
    await transactionRepository.create(db, { type: 'expense', amountMinor: 700, occurredOn: '2026-09-02' });
    const totals = await transactionRepository.categoryTotalsBetween(db, '2026-09-01', '2026-09-30');
    const byName = Object.fromEntries(totals.map((t) => [t.name, t]));
    expect(byName.Food).toMatchObject({ totalMinor: 75_000, count: 2, emoji: '🍔' });
    expect(byName.Transport.totalMinor).toBe(18_000);
    expect(byName.Uncategorized).toMatchObject({ categoryId: null, totalMinor: 700 });
    expect(byName.Housing).toBeUndefined();
  });

  it('lists a range newest first', async () => {
    const db = await seeded();
    const list = await transactionRepository.listBetween(db, '2026-09-20', '2026-09-21');
    expect(list.map((t) => t.occurredOn)).toEqual(['2026-09-21', '2026-09-21', '2026-09-20']);
  });
});

describe('accountRepository.updatePrimary', () => {
  it('changes currency and opening balance, validating both', async () => {
    const db = await setup();
    const updated = await accountRepository.updatePrimary(db, { currency: 'USD', openingBalanceMinor: 500_000 });
    expect(updated).toMatchObject({ currency: 'USD', openingBalanceMinor: 500_000 });
    await expect(accountRepository.updatePrimary(db, { currency: 'XYZ' as never })).rejects.toThrow(/currency/);
    await expect(accountRepository.updatePrimary(db, { openingBalanceMinor: 1.5 })).rejects.toThrow();
  });

  it('stamps new transactions with the current currency', async () => {
    const db = await setup();
    await accountRepository.updatePrimary(db, { currency: 'EUR' });
    const tx = await transactionRepository.create(db, { type: 'expense', amountMinor: 100, occurredOn: '2026-09-21' });
    expect(tx.currency).toBe('EUR');
  });
});
