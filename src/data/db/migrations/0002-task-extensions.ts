import type { SQLiteDatabase } from 'expo-sqlite';

export const version = 2;

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    ALTER TABLE tasks ADD COLUMN repeat_rule TEXT;
    ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER;
    ALTER TABLE tasks ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);
  `);
}
