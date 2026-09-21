import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_AMOUNT_MINOR, isCurrencyCode } from '@/domain/finance/currency';
import {
  EMPTY_TOTALS,
  PAYMENT_METHODS,
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

const TYPES: readonly TransactionType[] = ['income', 'expense', 'saving', 'transfer'];
const MERCHANT_MAX = 80;
const NOTE_MAX = 500;

interface TransactionRow {
  id: string;
  account_id: string;
  type: string;
  amount_minor: number;
  currency: string;
  category_id: string | null;
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
  };
}

const VIEW_SELECT = `
  SELECT t.*, c.name AS category_name, c.emoji AS category_emoji, c.color AS category_color
  FROM fin_transactions t
  LEFT JOIN fin_categories c ON c.id = t.category_id
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
  const category = await categoryRepository.getById(db, categoryId);
  if (!category) throw new Error('That category no longer exists.');
  if ((type === 'income' || type === 'expense') && category.kind !== type) {
    throw new Error(`"${category.name}" is an ${category.kind} category.`);
  }
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
  const paymentMethod = input.paymentMethod ?? null;
  if (paymentMethod !== null && !isPaymentMethod(paymentMethod)) {
    throw new Error(`Unknown payment method: ${String(paymentMethod)}`);
  }

  const account = await accountRepository.getPrimary(db);
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO fin_transactions
       (id, account_id, type, amount_minor, currency, category_id, occurred_on, occurred_at,
        merchant, payment_method, note, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    id,
    account.id,
    input.type,
    input.amountMinor,
    account.currency,
    categoryId,
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
     SET type = ?, amount_minor = ?, category_id = ?, occurred_on = ?, occurred_at = ?,
         merchant = ?, payment_method = ?, note = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    type,
    amountMinor,
    categoryId,
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
            SUM(CASE WHEN type = 'income' THEN amount_minor ELSE -amount_minor END) AS net,
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
