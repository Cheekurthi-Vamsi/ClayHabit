import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_AMOUNT_MINOR } from '@/domain/finance/currency';
import { OVERALL_BUDGET, type Budget, type MonthKey } from '@/domain/finance/entities';
import { isMonthKey } from '@/domain/finance/month';
import { generateId } from '@/utils/id';

import * as categoryRepository from './category-repository';

interface BudgetRow {
  scope: string;
  category_id: string | null;
  amount_minor: number;
  starts_month: string;
}

/**
 * Budgets in force for `month`: for each scope, the most recent row starting
 * on or before that month. A zero amount means that budget was removed.
 */
export async function budgetsForMonth(db: SQLiteDatabase, month: MonthKey): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    `SELECT b.scope, b.category_id, b.amount_minor, b.starts_month
     FROM fin_budgets b
     JOIN (
       SELECT scope, MAX(starts_month) AS latest FROM fin_budgets WHERE starts_month <= ? GROUP BY scope
     ) current ON current.scope = b.scope AND current.latest = b.starts_month
     WHERE b.amount_minor > 0`,
    month,
  );
  return rows.map((row) => ({
    scope: row.scope,
    categoryId: row.category_id,
    limitMinor: row.amount_minor,
    startsMonth: row.starts_month,
  }));
}

/**
 * Sets a monthly limit from `month` onward — for the whole month's spending
 * (`categoryId` null) or one expense category. Earlier months keep the budget
 * they had.
 */
export async function setBudget(
  db: SQLiteDatabase,
  { categoryId, amountMinor, month }: { categoryId: string | null; amountMinor: number; month: MonthKey },
): Promise<void> {
  if (!isMonthKey(month)) throw new Error(`Not a valid month: ${month}`);
  if (!Number.isInteger(amountMinor) || amountMinor < 0 || amountMinor > MAX_AMOUNT_MINOR) {
    throw new Error('Enter a budget amount.');
  }
  if (categoryId) {
    const category = await categoryRepository.getById(db, categoryId);
    if (!category) throw new Error('That category no longer exists.');
    if (category.kind !== 'expense') throw new Error('Budgets are for spending categories.');
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO fin_budgets (id, scope, category_id, amount_minor, starts_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (scope, starts_month) DO UPDATE SET amount_minor = excluded.amount_minor, updated_at = excluded.updated_at`,
    generateId(),
    categoryId ?? OVERALL_BUDGET,
    categoryId,
    amountMinor,
    month,
    now,
    now,
  );
}

/** Ends a budget from `month` onward (history before it is kept). */
export async function removeBudget(
  db: SQLiteDatabase,
  { categoryId, month }: { categoryId: string | null; month: MonthKey },
): Promise<void> {
  await setBudget(db, { categoryId, amountMinor: 0, month });
}
