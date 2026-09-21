import type { SQLiteDatabase } from 'expo-sqlite';

import type { Subtask } from '@/domain/entities/subtask';
import { generateId } from '@/utils/id';

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
  sort_order: number;
  created_at: string;
}

function toSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    isCompleted: row.is_completed === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listForTask(db: SQLiteDatabase, taskId: string): Promise<Subtask[]> {
  const rows = await db.getAllAsync<SubtaskRow>(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, created_at ASC',
    taskId,
  );
  return rows.map(toSubtask);
}

export async function create(db: SQLiteDatabase, taskId: string, title: string): Promise<Subtask> {
  const id = generateId();
  const now = new Date().toISOString();
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?',
    taskId,
  );
  const sortOrder = countRow?.count ?? 0;

  await db.runAsync(
    'INSERT INTO subtasks (id, task_id, title, is_completed, sort_order, created_at) VALUES (?, ?, ?, 0, ?, ?)',
    id,
    taskId,
    title.trim(),
    sortOrder,
    now,
  );

  return { id, taskId, title: title.trim(), isCompleted: false, sortOrder, createdAt: now };
}

export async function setCompleted(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean,
): Promise<void> {
  await db.runAsync('UPDATE subtasks SET is_completed = ? WHERE id = ?', isCompleted ? 1 : 0, id);
}

export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM subtasks WHERE id = ?', id);
}
