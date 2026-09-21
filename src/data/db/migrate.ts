import type { SQLiteDatabase } from 'expo-sqlite';

import { migrations } from './migrations';

export const DATABASE_NAME = 'clayhabit.db';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
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
