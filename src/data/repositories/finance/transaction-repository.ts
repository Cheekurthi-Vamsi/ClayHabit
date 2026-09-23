import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_AMOUNT_MINOR, isCurrencyCode } from '@/domain/finance/currency';
import {
  EMPTY_TOTALS,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type CategoryTotal,
  type FinTransaction,
  type FinTransactionView,
  type NewTransactionInput,
  type PaymentMethod,
  type TransactionType,
  type TypeTotals,
  type UpdateTransactionInput,
} from '@/domain/finance/entities';
import { isHabitColor } from '@/theme/habit-palette';
import { generateId } from '@/utils/id';

import * as accountRepository from './account-repository';
import * as categoryRepository from './category-repository';

const TYPES = TRANSACTION_TYPES;
const MERCHANT_MAX = 80;
const NOTE_MAX = 500;

interface TransactionRow {
  id: string;
  account_id: string;
  type: string;
  amount_minor: number;
  currency: string;
  category_id: string | null;
  savings_plan_id: string | null;
  occurred_on: string;
  occurred_at: string;
  merchant: string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface TransactionViewRow extends TransactionRow {
  category_name: string | null;
  category_emoji: string | null;
  category_color: string | null;
  plan_name: string | null;
  plan_emoji: string | null;
}

function isPaymentMethod(value: string | null): value is PaymentMethod {
  return value !== null && PAYMENT_METHODS.some((method) => method.key === value);
}

function toTransaction(row: TransactionRow): FinTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    type: (TYPES as readonly string[]).includes(row.type) ? (row.type as TransactionType) : 'expense',
    amountMinor: row.amount_minor,
    currency: isCurrencyCode(row.currency) ? row.currency : 'INR',
    categoryId: row.category_id,
    savingsPlanId: row.savings_plan_id ?? null,
    occurredOn: row.occurred_on,
    occurredAt: row.occurred_at,
    merchant: row.merchant,
    paymentMethod: isPaymentMethod(row.payment_method) ? row.payment_method : null,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toView(row: TransactionViewRow): FinTransactionView {
  return {
    ...toTransaction(row),
    category:
      row.category_id && row.category_name
        ? {
            id: row.category_id,
            name: row.category_name,
            emoji: row.category_emoji ?? '🏷️',
            color: row.category_color && isHabitColor(row.category_color) ? row.category_color : 'purple',
          }
        : null,
    savingsPlan:
      row.savings_plan_id && row.plan_name
        ? { id: row.savings_plan_id, name: row.plan_name, emoji: row.plan_emoji ?? '🎯' }
        : null,
  };
}

const VIEW_SELECT = `
  SELECT t.*, c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color,
         p.name AS plan_name, p.emoji AS plan_emoji
  FROM fin_transactions t
  LEFT JOIN fin_categories c ON c.id = t.category_id
  LEFT JOIN fin_savings_plans p ON p.id = t.savings_plan_id
`;
const NEWEST_FIRST = 'ORDER BY t.occurred_on DESC, t.occurred_at DESC, t.created_at DESC';

// ---- validation -----------------------------------------------------------

function assertAmount(amountMinor: number) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) {
    throw new Error('Enter an amount greater than zero.');
  }
}

function assertDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  if (!date || date.getMonth() !== Number(match![2]) - 1 || date.getDate() !== Number(match![3])) {
    throw new Error(`Not a valid date: ${iso}`);
  }
}

function cleanText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** An expense can't sit in an income category, or the other way round. */
async function assertCategoryFits(db: SQLiteDatabase, type: TransactionType, categoryId: string | null) {
  if (!categoryId) return;
  if (type === 'saving' || type === 'withdrawal') {
    throw new Error('Money moved in or out of savings belongs to a plan, not a category.');
  }
  const category = await categoryRepository.getById(db, categoryId);
  if (!category) throw new Error('That category no longer exists.');
  if ((type === 'income' || type === 'expense') && category.kind !== type) {
    throw new Error(`"${category.name}" is an ${category.kind} category.`);
  }
}

/** Savings entries always name their plan; nothing else may. */
async function assertPlanFits(db: SQLiteDatabase, type: TransactionType, planId: string | null) {
  const needsPlan = type === 'saving' || type === 'withdrawal';
  if (!needsPlan) {
    if (planId) throw new Error('Only savings entries belong to a savings plan.');
    return;
  }
  if (!planId) throw new Error('Choose which savings plan this is for.');
  const plan = await db.getFirstAsync<{ id: string }>('SELECT id FROM fin_savings_plans WHERE id = ?', planId);
  if (!plan) throw new Error('That savings plan no longer exists.');
}

/** The instant for a picked day: now if it's today, otherwise that day at the current time of day. */
function defaultInstant(occurredOn: string): string {
  const now = new Date();
  const [year, month, day] = occurredOn.split('-').map(Number);
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}

// ---- writes ---------------------------------------------------------------

export async function create(db: SQLiteDatabase, input: NewTransactionInput): Promise<FinTransaction> {
  if (!TYPES.includes(input.type)) throw new Error(`Unknown transaction type: ${String(input.type)}`);
  assertAmount(input.amountMinor);
  assertDate(input.occurredOn);
  const categoryId = input.categoryId ?? null;
  await assertCategoryFits(db, input.type, categoryId);
  const savingsPlanId = input.savingsPlanId ?? null;
  await assertPlanFits(db, input.type, savingsPlanId);
  const paymentMethod = input.paymentMethod ?? null;
  if (paymentMethod !== null && !isPaymentMethod(paymentMethod)) {
    throw new Error(`Unknown payment method: ${String(paymentMethod)}`);
  }

  const account = await accountRepository.getPrimary(db);
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO fin_transactions
       (id, account_id, type, amount_minor, currency, category_id, savings_plan_id, occurred_on, occurred_at,
        merchant, payment_method, note, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    id,
    account.id,
    input.type,
    input.amountMinor,
    account.currency,
    categoryId,
    savingsPlanId,
    input.occurredOn,
    input.occurredAt ?? defaultInstant(input.occurredOn),
    cleanText(input.merchant, MERCHANT_MAX),
    paymentMethod,
    cleanText(input.note, NOTE_MAX),
    now,
    now,
  );

  const created = await getById(db, id);
  if (!created) throw new Error("Couldn't read back the saved transaction.");
  return created;
}

export async function update(db: SQLiteDatabase, id: string, input: UpdateTransactionInput): Promise<FinTransaction> {
  const existing = await getById(db, id);
  if (!existing) throw new Error('This transaction no longer exists.');

  const type = input.type ?? existing.type;
  if (!TYPES.includes(type)) throw new Error(`Unknown transaction type: ${String(type)}`);
  const amountMinor = input.amountMinor ?? existing.amountMinor;
  assertAmount(amountMinor);
  const occurredOn = input.occurredOn ?? existing.occurredOn;
  assertDate(occurredOn);
  const categoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId;
  await assertCategoryFits(db, type, categoryId);
  const savingsPlanId = input.savingsPlanId !== undefined ? input.savingsPlanId : existing.savingsPlanId;
  await assertPlanFits(db, type, savingsPlanId);
  const paymentMethod = input.paymentMethod !== undefined ? input.paymentMethod : existing.paymentMethod;
  if (paymentMethod !== null && !isPaymentMethod(paymentMethod)) {
    throw new Error(`Unknown payment method: ${String(paymentMethod)}`);
  }

  // Moving the day keeps the original time of day, so ordering within a day stays stable.
  const occurredAt =
    input.occurredAt ??
    (occurredOn === existing.occurredOn
      ? existing.occurredAt
      : (() => {
          const time = new Date(existing.occurredAt);
          const [year, month, day] = occurredOn.split('-').map(Number);
          return new Date(year, month - 1, day, time.getHours(), time.getMinutes(), time.getSeconds()).toISOString();
        })());

  await db.runAsync(
    `UPDATE fin_transactions
     SET type = ?, amount_minor = ?, category_id = ?, savings_plan_id = ?, occurred_on = ?, occurred_at = ?,
         merchant = ?, payment_method = ?, note = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    type,
    amountMinor,
    categoryId,
    savingsPlanId,
    occurredOn,
    occurredAt,
    input.merchant !== undefined ? cleanText(input.merchant, MERCHANT_MAX) : existing.merchant,
    paymentMethod,
    input.note !== undefined ? cleanText(input.note, NOTE_MAX) : existing.note,
    new Date().toISOString(),
    id,
  );

  const updated = await getById(db, id);
  if (!updated) throw new Error("Couldn't read back the saved transaction.");
  return updated;
}

/** Hides a transaction from every balance and list. The row itself is kept. */
export async function softDelete(db: SQLiteDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE fin_transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    now,
    now,
    id,
  );
}

// ---- reads ----------------------------------------------------------------

export async function getById(db: SQLiteDatabase, id: string): Promise<FinTransactionView | null> {
  const row = await db.getFirstAsync<TransactionViewRow>(
    `${VIEW_SELECT} WHERE t.id = ? AND t.deleted_at IS NULL`,
    id,
  );
  return row ? toView(row) : null;
}

export async function listRecent(db: SQLiteDatabase, limit: number): Promise<FinTransactionView[]> {
  const rows = await db.getAllAsync<TransactionViewRow>(
    `${VIEW_SELECT} WHERE t.deleted_at IS NULL ${NEWEST_FIRST} LIMIT ?`,
    limit,
  );
  return rows.map(toView);
}

/** Transactions on local days [from, to], newest first. */
export async function listBetween(db: SQLiteDatabase, from: string, to: string): Promise<FinTransactionView[]> {
  const rows = await db.getAllAsync<TransactionViewRow>(
    `${VIEW_SELECT} WHERE t.deleted_at IS NULL AND t.occurred_on >= ? AND t.occurred_on <= ? ${NEWEST_FIRST}`,
    from,
    to,
  );
  return rows.map(toView);
}

export async function countAll(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM fin_transactions WHERE deleted_at IS NULL',
  );
  return row?.total ?? 0;
}

/** Totals per type for local days in [from, to]; either end may be open. */
export async function totalsBetween(
  db: SQLiteDatabase,
  range: { from?: string; to?: string } = {},
): Promise<TypeTotals> {
  const clauses = ['deleted_at IS NULL'];
  const params: string[] = [];
  if (range.from) {
    clauses.push('occurred_on >= ?');
    params.push(range.from);
  }
  if (range.to) {
    clauses.push('occurred_on <= ?');
    params.push(range.to);
  }

  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT type, SUM(amount_minor) AS total FROM fin_transactions WHERE ${clauses.join(' AND ')} GROUP BY type`,
    ...params,
  );

  const totals: TypeTotals = { ...EMPTY_TOTALS };
  for (const row of rows) {
    if ((TYPES as readonly string[]).includes(row.type)) totals[row.type as TransactionType] = row.total ?? 0;
  }
  return totals;
}

/** Net change to the balance per local day in [from, to], plus the day's income and expense. */
export async function dailyFlowsBetween(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<Record<string, { net: number; income: number; expense: number }>> {
  const rows = await db.getAllAsync<{ day: string; net: number; income: number; expense: number }>(
    `SELECT occurred_on AS day,
            SUM(CASE WHEN type IN ('income', 'withdrawal') THEN amount_minor ELSE -amount_minor END) AS net,
            SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) AS expense
     FROM fin_transactions
     WHERE deleted_at IS NULL AND occurred_on >= ? AND occurred_on <= ?
     GROUP BY occurred_on`,
    from,
    to,
  );
  return Object.fromEntries(rows.map((row) => [row.day, { net: row.net, income: row.income, expense: row.expense }]));
}

/** Spend (or income) per category over local days [from, to]. Uncategorised records are grouped together. */
export async function categoryTotalsBetween(
  db: SQLiteDatabase,
  from: string,
  to: string,
  type: 'expense' | 'income' = 'expense',
): Promise<CategoryTotal[]> {
  const rows = await db.getAllAsync<{
    category_id: string | null;
    name: string | null;
    emoji: string | null;
    color: string | null;
    total: number;
    count: number;
  }>(
    `SELECT t.category_id, c.name, c.emoji, c.color, SUM(t.amount_minor) AS total, COUNT(*) AS count
     FROM fin_transactions t
     LEFT JOIN fin_categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL AND t.type = ? AND t.occurred_on >= ? AND t.occurred_on <= ?
     GROUP BY t.category_id`,
    type,
    from,
    to,
  );

  return rows.map((row) => ({
    categoryId: row.category_id,
    name: row.name ?? 'Uncategorized',
    emoji: row.emoji ?? '🏷️',
    color: row.color && isHabitColor(row.color) ? row.color : 'purple',
    totalMinor: row.total,
    count: row.count,
  }));
}

export interface TransactionFilter {
  /** Local days, inclusive; either may be open. */
  from?: string;
  to?: string;
  /** Matches merchant, note, category or savings-plan name (case-insensitive). */
  query?: string;
  type?: TransactionType;
  /** A category id, or `null` for uncategorised only. */
  categoryId?: string | null;
  paymentMethod?: PaymentMethod;
  savingsPlanId?: string;
  limit?: number;
}

/** Search and filter across every transaction, newest first. */
export async function listFiltered(db: SQLiteDatabase, filter: TransactionFilter): Promise<FinTransactionView[]> {
  const clauses = ['t.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (filter.from) {
    clauses.push('t.occurred_on >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push('t.occurred_on <= ?');
    params.push(filter.to);
  }
  if (filter.type) {
    clauses.push('t.type = ?');
    params.push(filter.type);
  }
  if (filter.categoryId === null) {
    clauses.push('t.category_id IS NULL');
  } else if (filter.categoryId) {
    clauses.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.paymentMethod) {
    clauses.push('t.payment_method = ?');
    params.push(filter.paymentMethod);
  }
  if (filter.savingsPlanId) {
    clauses.push('t.savings_plan_id = ?');
    params.push(filter.savingsPlanId);
  }
  const query = filter.query?.trim().toLowerCase();
  if (query) {
    // Escape LIKE wildcards so a search for "50%" means those characters, not a pattern.
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const like = (column: string) => `LOWER(IFNULL(${column}, '')) LIKE ? ESCAPE '\\'`;
    clauses.push(`(${[like('t.merchant'), like('t.note'), like('c.name'), like('p.name')].join(' OR ')})`);
    params.push(pattern, pattern, pattern, pattern);
  }

  const rows = await db.getAllAsync<TransactionViewRow>(
    `${VIEW_SELECT} WHERE ${clauses.join(' AND ')} ${NEWEST_FIRST} LIMIT ?`,
    ...params,
    filter.limit ?? 200,
  );
  return rows.map(toView);
}

/** Totals per type for each calendar month from `fromMonthStart` (`YYYY-MM-DD`) on, optionally up to `toDay`. */
export async function monthlyTotalsSince(
  db: SQLiteDatabase,
  fromMonthStart: string,
  toDay?: string,
): Promise<Record<string, TypeTotals>> {
  const rows = await db.getAllAsync<{ month: string; type: string; total: number }>(
    `SELECT substr(occurred_on, 1, 7) AS month, type, SUM(amount_minor) AS total
     FROM fin_transactions
     WHERE deleted_at IS NULL AND occurred_on >= ? ${toDay ? 'AND occurred_on <= ?' : ''}
     GROUP BY month, type`,
    ...(toDay ? [fromMonthStart, toDay] : [fromMonthStart]),
  );
  const byMonth: Record<string, TypeTotals> = {};
  for (const row of rows) {
    if (!(TYPES as readonly string[]).includes(row.type)) continue;
    byMonth[row.month] ??= { ...EMPTY_TOTALS };
    byMonth[row.month][row.type as TransactionType] = row.total;
  }
  return byMonth;
}

/** The single largest expense over local days [from, to], if any. */
export async function largestExpenseBetween(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<FinTransactionView | null> {
  const row = await db.getFirstAsync<TransactionViewRow>(
    `${VIEW_SELECT} WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.occurred_on >= ? AND t.occurred_on <= ?
     ORDER BY t.amount_minor DESC, t.occurred_on DESC LIMIT 1`,
    from,
    to,
  );
  return row ? toView(row) : null;
}

/** The first and last local days with a record, or nulls when nothing is recorded yet. */
export async function dateBounds(db: SQLiteDatabase): Promise<{ first: string | null; last: string | null }> {
  const row = await db.getFirstAsync<{ first: string | null; last: string | null }>(
    'SELECT MIN(occurred_on) AS first, MAX(occurred_on) AS last FROM fin_transactions WHERE deleted_at IS NULL',
  );
  return { first: row?.first ?? null, last: row?.last ?? null };
}

/** How many records fall on local days [from, to]. */
export async function countBetween(db: SQLiteDatabase, from: string, to: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM fin_transactions WHERE deleted_at IS NULL AND occurred_on >= ? AND occurred_on <= ?',
    from,
    to,
  );
  return row?.total ?? 0;
}

/** Days in [from, to] with at least one expense. */
export async function spendingDaysBetween(db: SQLiteDatabase, from: string, to: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(DISTINCT occurred_on) AS total FROM fin_transactions
     WHERE deleted_at IS NULL AND type = 'expense' AND occurred_on >= ? AND occurred_on <= ?`,
    from,
    to,
  );
  return row?.total ?? 0;
}

/** Total spending per weekday over [from, to], indexed like strftime('%w'): 0 = Sunday. */
export async function weekdayExpenseTotalsBetween(db: SQLiteDatabase, from: string, to: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ weekday: string; total: number }>(
    `SELECT strftime('%w', occurred_on) AS weekday, SUM(amount_minor) AS total FROM fin_transactions
     WHERE deleted_at IS NULL AND type = 'expense' AND occurred_on >= ? AND occurred_on <= ?
     GROUP BY weekday`,
    from,
    to,
  );
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const row of rows) {
    const weekday = Number(row.weekday);
    if (weekday >= 0 && weekday <= 6) totals[weekday] = row.total ?? 0;
  }
  return totals;
}

/** Spending per payment method over [from, to]; `method` is null for payments recorded without one. */
export async function paymentMethodTotalsBetween(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<{ method: PaymentMethod | null; totalMinor: number; count: number }[]> {
  const rows = await db.getAllAsync<{ method: string | null; total: number; count: number }>(
    `SELECT payment_method AS method, SUM(amount_minor) AS total, COUNT(*) AS count FROM fin_transactions
     WHERE deleted_at IS NULL AND type = 'expense' AND occurred_on >= ? AND occurred_on <= ?
     GROUP BY payment_method`,
    from,
    to,
  );
  // An unrecognised stored value counts as "not set" rather than disappearing from the totals.
  const merged = new Map<PaymentMethod | null, { totalMinor: number; count: number }>();
  for (const row of rows) {
    const method = isPaymentMethod(row.method) ? row.method : null;
    const entry = merged.get(method) ?? { totalMinor: 0, count: 0 };
    entry.totalMinor += row.total ?? 0;
    entry.count += row.count ?? 0;
    merged.set(method, entry);
  }
  return [...merged].map(([method, entry]) => ({ method, ...entry }));
}
