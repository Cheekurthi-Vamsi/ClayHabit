import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 6;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    ALTER TABLE tasks ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      planned_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON focus_sessions(task_id);
  `);
}
