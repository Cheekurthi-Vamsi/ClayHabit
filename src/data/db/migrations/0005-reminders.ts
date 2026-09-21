import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 5;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE tasks ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE tasks ADD COLUMN reminder_time TEXT;
    ALTER TABLE tasks ADD COLUMN notification_id TEXT;
  `);
}
