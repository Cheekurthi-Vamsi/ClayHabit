import type { SQLiteDatabase } from 'expo-sqlite';

import { migrations } from './migrations';

export const DATABASE_NAME = 'clayhabit.db';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  // foreign_keys is a per-connection setting, not persisted in the db file,
  // so it must be re-applied on every launch (not just inside a migration).
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;

  const pending = [...migrations]
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await migration.up(db);
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    currentVersion = migration.version;
  }
}
