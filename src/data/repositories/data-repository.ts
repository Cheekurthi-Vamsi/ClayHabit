import type { SQLiteDatabase } from 'expo-sqlite';

import * as financeDefaults from '../db/migrations/0009-finance';

export interface DataSummary {
  tasks: number;
  notes: number;
  habits: number;
  transactions: number;
  goals: number;
  events: number;
}

async function count(db: SQLiteDatabase, sql: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(sql);
  return row?.count ?? 0;
}

/** What this account holds, for Settings → Data & storage. */
export async function summarize(db: SQLiteDatabase): Promise<DataSummary> {
  const [tasks, notes, habits, transactions, goals, events] = await Promise.all([
    count(db, 'SELECT COUNT(*) AS count FROM tasks WHERE is_archived = 0'),
    count(db, 'SELECT COUNT(*) AS count FROM notes WHERE is_trashed = 0'),
    count(db, 'SELECT COUNT(*) AS count FROM habits WHERE is_archived = 0'),
    count(db, 'SELECT COUNT(*) AS count FROM fin_transactions WHERE deleted_at IS NULL'),
    count(db, 'SELECT COUNT(*) AS count FROM goals WHERE is_archived = 0'),
    count(db, 'SELECT COUNT(*) AS count FROM calendar_events'),
  ]);
  return { tasks, notes, habits, transactions, goals, events };
}

/**
 * Deletes everything the person has made — every row of every table — and
 * puts back the built-in finance account and categories, leaving the same
 * empty app a new account starts with. The schema and its version stay.
 */
export async function eraseAll(db: SQLiteDatabase): Promise<void> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  // Foreign keys can only be toggled outside a transaction; with them off, table order doesn't matter.
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.execAsync('BEGIN');
    try {
      for (const { name } of tables) {
        await db.execAsync(`DELETE FROM "${name.replace(/"/g, '""')}"`);
      }
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  // Re-runnable by design (IF NOT EXISTS / INSERT OR IGNORE): restores the default account and categories.
  await financeDefaults.up(db);
}
