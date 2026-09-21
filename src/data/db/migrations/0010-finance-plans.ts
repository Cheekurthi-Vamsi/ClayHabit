import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 10;

const TRANSACTION_COLUMNS =
  'id, account_id, type, amount_minor, currency, category_id, occurred_on, occurred_at, merchant, payment_method, note, deleted_at, created_at, updated_at';

/**
 * Budgets and savings plans.
 *
 * - `fin_savings_plans`: what someone is saving toward. How much is saved is
 *   never stored — it's the sum of the plan's `saving` minus `withdrawal`
 *   transactions, like every other balance here.
 * - `fin_transactions` is rebuilt to admit a `withdrawal` type (money taken
 *   back out of savings) and to link entries to a plan. SQLite can't widen a
 *   CHECK constraint in place, so the table is copied row for row inside a
 *   transaction.
 * - `fin_budgets` are effective-dated: changing a budget adds a row that
 *   applies from that month on, so earlier months are still judged against
 *   the budget they actually had. An amount of 0 ends a budget.
 */
export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fin_savings_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎯',
      color TEXT NOT NULL DEFAULT 'mint',
      target_minor INTEGER NOT NULL CHECK (target_minor > 0),
      target_date TEXT,
      monthly_contribution_minor INTEGER CHECK (monthly_contribution_minor IS NULL OR monthly_contribution_minor > 0),
      priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1, 2, 3)),
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fin_budgets (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      category_id TEXT REFERENCES fin_categories(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
      starts_month TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (scope, starts_month)
    );
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(fin_transactions)');
  if (columns.some((column) => column.name === 'savings_plan_id')) return;

  // Rebuilding a table that has foreign keys needs enforcement paused (and it can't
  // change inside a transaction), per SQLite's documented ALTER TABLE procedure.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.execAsync(`
      BEGIN;
      DROP TABLE IF EXISTS fin_transactions_v2;
      CREATE TABLE fin_transactions_v2 (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES fin_accounts(id),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'saving', 'withdrawal', 'transfer')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency TEXT NOT NULL,
        category_id TEXT REFERENCES fin_categories(id) ON DELETE SET NULL,
        savings_plan_id TEXT REFERENCES fin_savings_plans(id) ON DELETE SET NULL,
        occurred_on TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        merchant TEXT,
        payment_method TEXT,
        note TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO fin_transactions_v2 (${TRANSACTION_COLUMNS}) SELECT ${TRANSACTION_COLUMNS} FROM fin_transactions;
      DROP TABLE fin_transactions;
      ALTER TABLE fin_transactions_v2 RENAME TO fin_transactions;
      CREATE INDEX IF NOT EXISTS idx_fin_tx_occurred_on ON fin_transactions(occurred_on) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_fin_tx_category ON fin_transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_fin_tx_plan ON fin_transactions(savings_plan_id);
      COMMIT;
    `);
  } catch (error) {
    await db.execAsync('ROLLBACK;').catch(() => {});
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
