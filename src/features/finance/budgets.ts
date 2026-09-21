import type { SQLiteDatabase } from 'expo-sqlite';

import * as budgetRepository from '@/data/repositories/finance/budget-repository';
import * as categoryRepository from '@/data/repositories/finance/category-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import { buildBudgetPicture, type BudgetPicture } from '@/domain/finance/budget';
import type { MonthKey } from '@/domain/finance/entities';
import { monthEnd, monthStart } from '@/domain/finance/month';

/** A month's budgets set against what was actually spent in it. */
export async function loadBudgetPicture(db: SQLiteDatabase, month: MonthKey): Promise<BudgetPicture> {
  const from = monthStart(month);
  const to = monthEnd(month);
  const [budgets, categories, totals, spending] = await Promise.all([
    budgetRepository.budgetsForMonth(db, month),
    categoryRepository.listByKind(db, 'expense'),
    transactionRepository.categoryTotalsBetween(db, from, to, 'expense'),
    transactionRepository.totalsBetween(db, { from, to }),
  ]);
  const spentByCategory = Object.fromEntries(
    totals.filter((total) => total.categoryId).map((total) => [total.categoryId!, total.totalMinor]),
  );
  return buildBudgetPicture(budgets, categories, spentByCategory, spending.expense);
}
