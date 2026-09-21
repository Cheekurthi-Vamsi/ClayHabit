import type { SQLiteDatabase } from 'expo-sqlite';

import type { Goal, GoalWithProgress, NewGoalInput, UpdateGoalInput } from '@/domain/entities/goal';
import { generateId } from '@/utils/id';

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    deadline: row.deadline,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAll(db: SQLiteDatabase): Promise<GoalWithProgress[]> {
  const rows = await db.getAllAsync<
    GoalRow & { task_count: number; completed_task_count: number }
  >(`
    SELECT
      goals.*,
      COUNT(tasks.id) as task_count,
      SUM(CASE WHEN tasks.is_completed = 1 THEN 1 ELSE 0 END) as completed_task_count
    FROM goals
    LEFT JOIN tasks ON tasks.goal_id = goals.id AND tasks.is_archived = 0
    WHERE goals.is_archived = 0
    GROUP BY goals.id
    ORDER BY goals.created_at DESC
  `);

  return rows.map((row) => ({
    ...toGoal(row),
    taskCount: row.task_count,
    completedTaskCount: row.completed_task_count ?? 0,
  }));
}

export async function getById(db: SQLiteDatabase, id: string): Promise<Goal | null> {
  const row = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ?', id);
  return row ? toGoal(row) : null;
}

export async function create(db: SQLiteDatabase, input: NewGoalInput): Promise<Goal> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO goals (id, title, description, deadline, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
    id,
    input.title.trim(),
    input.description ?? null,
    input.deadline ?? null,
    now,
    now,
  );

  return {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    deadline: input.deadline ?? null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function update(db: SQLiteDatabase, id: string, input: UpdateGoalInput): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) return;

  await db.runAsync(
    'UPDATE goals SET title = ?, description = ?, deadline = ?, updated_at = ? WHERE id = ?',
    input.title?.trim() ?? existing.title,
    input.description !== undefined ? input.description : existing.description,
    input.deadline !== undefined ? input.deadline : existing.deadline,
    new Date().toISOString(),
    id,
  );
}

export async function setArchived(db: SQLiteDatabase, id: string, isArchived: boolean): Promise<void> {
  await db.runAsync('UPDATE goals SET is_archived = ? WHERE id = ?', isArchived ? 1 : 0, id);
}

export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}
