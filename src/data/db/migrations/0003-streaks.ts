import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 3;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE tasks ADD COLUMN series_id TEXT;
    UPDATE tasks SET series_id = id WHERE series_id IS NULL;

    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      series_id TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_task_completions_series ON task_completions(series_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_series_date
      ON task_completions(series_id, occurred_on);

    INSERT INTO task_completions (id, task_id, series_id, occurred_on, completed_at)
    SELECT lower(hex(randomblob(16))), id, series_id, COALESCE(due_date, substr(completed_at, 1, 10)), completed_at
    FROM tasks
    WHERE is_completed = 1
    ON CONFLICT(series_id, occurred_on) DO NOTHING;
  `);
}
