import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 9;

/** The one account every transaction belongs to until multiple accounts exist. */
export const PRIMARY_ACCOUNT_ID = 'main';

/** [id, name, emoji, color] — default categories, in display order. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  ['exp-food', 'Food', '🍔', 'amber'],
  ['exp-housing', 'Housing', '🏠', 'purple'],
  ['exp-transport', 'Transport', '🚕', 'blue'],
  ['exp-shopping', 'Shopping', '🛒', 'pink'],
  ['exp-utilities', 'Utilities', '💡', 'amber'],
  ['exp-subscriptions', 'Subscriptions', '📱', 'purple'],
  ['exp-health', 'Health', '🏥', 'mint'],
  ['exp-education', 'Education', '🎓', 'blue'],
  ['exp-work', 'Work', '💻', 'cyan'],
  ['exp-entertainment', 'Entertainment', '🎮', 'pink'],
  ['exp-travel', 'Travel', '✈️', 'cyan'],
  ['exp-personal', 'Personal', '👕', 'purple'],
  ['exp-savings', 'Savings', '💰', 'mint'],
  ['exp-investments', 'Investments', '📈', 'blue'],
  ['exp-gifts', 'Gifts', '🎁', 'pink'],
  ['exp-other', 'Other', '📦', 'cyan'],
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  ['inc-salary', 'Salary', '💼', 'mint'],
  ['inc-freelance', 'Freelance', '🧑‍💻', 'blue'],
  ['inc-business', 'Business', '🏪', 'purple'],
  ['inc-investment', 'Investment', '📈', 'cyan'],
  ['inc-other', 'Other income', '💵', 'amber'],
] as const;

/**
 * The financial domain's own tables, prefixed `fin_` and never joined to the
 * productivity tables.
 *
 * - Amounts are INTEGER hundredths of the major unit (see domain/finance/currency.ts).
 * - A transaction's calendar day (`occurred_on`, local) is stored apart from
 *   its instant (`occurred_at`), so month and day grouping never shifts with
 *   the UTC offset.
 * - Transactions are soft-deleted (`deleted_at`): balances are always
 *   recomputed from the records, and no record is ever destroyed by an edit.
 * - The type CHECK already admits saving/transfer, since SQLite can't widen a
 *   CHECK constraint later without rebuilding the table.
 *
 * Written to be safely re-runnable (IF NOT EXISTS / INSERT OR IGNORE) in case
 * the app is killed part-way through.
 */
export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fin_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      opening_balance_minor INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fin_categories (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'purple',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fin_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES fin_accounts(id),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving', 'transfer')),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency TEXT NOT NULL,
      category_id TEXT REFERENCES fin_categories(id) ON DELETE SET NULL,
      occurred_on TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      merchant TEXT,
      payment_method TEXT,
      note TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fin_tx_occurred_on ON fin_transactions(occurred_on) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_fin_tx_category ON fin_transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_fin_categories_kind ON fin_categories(kind, sort_order);
  `);

  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR IGNORE INTO fin_accounts (id, name, currency, opening_balance_minor, created_at, updated_at)
     VALUES (?, 'Main', 'INR', 0, ?, ?)`,
    PRIMARY_ACCOUNT_ID,
    now,
    now,
  );

  const seed = async (kind: 'expense' | 'income', rows: readonly (readonly [string, string, string, string])[]) => {
    for (const [index, [id, name, emoji, color]] of rows.entries()) {
      await db.runAsync(
        `INSERT OR IGNORE INTO fin_categories (id, kind, name, emoji, color, sort_order, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        id,
        kind,
        name,
        emoji,
        color,
        index,
        now,
        now,
      );
    }
  };
  await seed('expense', DEFAULT_EXPENSE_CATEGORIES);
  await seed('income', DEFAULT_INCOME_CATEGORIES);
}
