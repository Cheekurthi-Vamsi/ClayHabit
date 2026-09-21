import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * A minimal expo-sqlite-shaped adapter backed by Node's built-in `node:sqlite`,
 * used only in tests so migrations/repositories can be exercised against a real
 * SQLite engine without the native expo-sqlite module (which requires a device/simulator).
 */
export function createTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');

  const adapter = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      const info = raw.prepare(sql).run(...(params as never[]));
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    getAllAsync: async (sql: string, ...params: unknown[]) => {
      return raw.prepare(sql).all(...(params as never[]));
    },
    getFirstAsync: async (sql: string, ...params: unknown[]) => {
      return raw.prepare(sql).get(...(params as never[])) ?? null;
    },
  };

  return adapter as unknown as SQLiteDatabase;
}
