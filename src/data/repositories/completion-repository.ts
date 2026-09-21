import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@/utils/id';

export async function recordCompletion(
  db: SQLiteDatabase,
  taskId: string,
  seriesId: string,
  occurredOn: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO task_completions (id, task_id, series_id, occurred_on, completed_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(series_id, occurred_on) DO NOTHING`,
    generateId(),
    taskId,
    seriesId,
    occurredOn,
    new Date().toISOString(),
  );
}

export async function removeCompletion(
  db: SQLiteDatabase,
  seriesId: string,
  occurredOn: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM task_completions WHERE series_id = ? AND occurred_on = ?',
    seriesId,
    occurredOn,
  );
}

export async function listDatesForSeries(db: SQLiteDatabase, seriesId: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ occurred_on: string }>(
    'SELECT occurred_on FROM task_completions WHERE series_id = ? ORDER BY occurred_on ASC',
    seriesId,
  );
  return rows.map((row) => row.occurred_on);
}
