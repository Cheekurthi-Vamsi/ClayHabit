import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Tables holding things a person made. Built-in rows (the default finance
 * account and categories) don't count, so a fresh install reads as empty.
 */
const USER_TABLES = [
  'tasks',
  'notes',
  'folders',
  'projects',
  'goals',
  'habits',
  'calendar_events',
  'focus_sessions',
  'fin_transactions',
  'fin_savings_plans',
  'fin_budgets',
];

export async function countUserRecords(db: SQLiteDatabase): Promise<number> {
  let total = 0;
  for (const table of USER_TABLES) {
    try {
      const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
      total += row?.count ?? 0;
    } catch {
      // A table from a later migration may not exist yet.
    }
  }
  return total;
}

/**
 * Bytes 18–19 of the SQLite header say whether the file uses a write-ahead
 * log. An in-memory copy can't have one, and an image still marked "WAL"
 * fails to open once deserialized — so snapshots are always marked as
 * rollback-journal databases. The data itself is unaffected: serialize reads
 * through the pager, WAL contents included.
 */
export function markAsRollbackJournal(bytes: Uint8Array): Uint8Array {
  if (bytes.length > 19 && bytes[18] === 2 && bytes[19] === 2) {
    bytes[18] = 1;
    bytes[19] = 1;
  }
  return bytes;
}
