import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewTaskInput, Task, TaskPriority } from '@/domain/entities/task';
import { generateId } from '@/utils/id';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  project_id: string | null;
  is_completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    projectId: row.project_id,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listToday(db: SQLiteDatabase, todayIso: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE (due_date = ? OR due_date IS NULL)
     ORDER BY is_completed ASC, priority = 'urgent' DESC, priority = 'high' DESC, due_time ASC, created_at ASC`,
    todayIso,
  );
  return rows.map(toTask);
}

export async function listAll(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     ORDER BY is_completed ASC, due_date IS NULL, due_date ASC, created_at DESC`,
  );
  return rows.map(toTask);
}

export async function countTable(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
  return row?.count ?? 0;
}

export async function create(db: SQLiteDatabase, input: NewTaskInput): Promise<Task> {
  const id = generateId();
  const now = new Date().toISOString();
  const priority: TaskPriority = input.priority ?? 'medium';

  await db.runAsync(
    `INSERT INTO tasks (id, title, description, due_date, due_time, priority, project_id, is_completed, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, ?)`,
    id,
    input.title.trim(),
    input.description ?? null,
    input.dueDate ?? null,
    input.dueTime ?? null,
    priority,
    now,
    now,
  );

  return {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    priority,
    projectId: null,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function setCompleted(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    isCompleted ? 1 : 0,
    isCompleted ? now : null,
    now,
    id,
  );
}

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const count = await countTable(db);
  if (count > 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const sample: NewTaskInput[] = [
    { title: 'Review cybersecurity project notes', dueDate: today, dueTime: '09:30', priority: 'high' },
    { title: 'Finish onboarding flow wireframes', dueDate: today, dueTime: '13:00', priority: 'medium' },
    { title: 'Reply to team standup thread', dueDate: today, priority: 'low' },
    { title: 'Plan next week focus blocks', dueDate: today, dueTime: '18:00', priority: 'medium' },
  ];

  for (const task of sample) {
    await create(db, task);
  }
}
