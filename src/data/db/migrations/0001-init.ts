import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 1;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = 'wal';

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
  `);
}
