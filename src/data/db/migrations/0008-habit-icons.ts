import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 8;

/**
 * Habits can show a bundled icon (`line:run`, `emoji:droplet`). Null keeps the
 * plain `emoji` text, which every habit still carries as its fallback.
 */
export async function up(db: SQLiteDatabase) {
  await db.execAsync('ALTER TABLE habits ADD COLUMN icon TEXT;');
}
